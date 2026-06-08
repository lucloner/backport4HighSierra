#!/usr/bin/env python3
"""
Patch Mach-O binaries to redirect ____chkstk_darwin from libSystem.B.dylib
to @executable_path/libchkstk.dylib, without requiring DYLD_FORCE_FLAT_NAMESPACE.

Strategy:
1. Add LC_LOAD_DYLIB for @executable_path/libchkstk.dylib
2. Change the library ordinal in n_desc for ____chkstk_darwin symbol table entries
3. Change the library ordinal in WEAK bind data for ____chkstk_darwin
4. Zero out code signature data
5. Patch LC_BUILD_VERSION minos to 10.13
"""

import struct
import sys
import os

MH_MAGIC_64 = 0xFEEDFACF
MH_MAGIC = 0xFEEDFACE
FAT_MAGIC = 0xCAFEBABE
FAT_MAGIC_SWAPPED = 0xBEBAFECA

LC_SEGMENT_64 = 0x19
LC_DYLD_INFO_ONLY = 0x80000022
LC_LOAD_DYLIB = 0x0C
LC_LOAD_WEAK_DYLIB = 0x8000001E
LC_REEXPORT_DYLIB = 0x8000001F
LC_LAZY_LOAD_DYLIB = 0x80000020
LC_LOAD_UPWARD_DYLIB = 0x80000021
LC_CODE_SIGNATURE = 0x1D
LC_BUILD_VERSION = 0x32
LC_SYMTAB = 0x02
LC_DYSYMTAB = 0x0B

DYLIB_LOAD_CMDS = (LC_LOAD_DYLIB, LC_LOAD_WEAK_DYLIB, LC_REEXPORT_DYLIB,
                   LC_LAZY_LOAD_DYLIB, LC_LOAD_UPWARD_DYLIB)


def align8(size):
    return (size + 7) & ~7


def make_dylib_command(path, cmd_type=LC_LOAD_DYLIB):
    path_bytes = path.encode('utf-8') + b'\x00'
    cmdsize = 24 + len(path_bytes)
    cmdsize = align8(cmdsize)
    path_bytes = path_bytes + b'\x00' * (cmdsize - 24 - len(path_bytes))
    
    cmd = struct.pack('<II', cmd_type, cmdsize)
    dylib = struct.pack('<III', 24, 0, 0x10000)
    compat = struct.pack('<I', 0x10000)
    return cmd + dylib + compat + path_bytes


def read_uleb128(data, pos):
    result = 0
    shift = 0
    while True:
        byte = data[pos]
        pos += 1
        result |= (byte & 0x7F) << shift
        shift += 7
        if (byte & 0x80) == 0:
            break
    return result, pos


def read_sleb128(data, pos):
    result = 0
    shift = 0
    while True:
        byte = data[pos]
        pos += 1
        result |= (byte & 0x7F) << shift
        shift += 7
        if (byte & 0x80) == 0:
            if byte & 0x40:
                result |= -(1 << shift)
            break
    return result, pos


def patch_weak_bind(data, weak_off, weak_size, old_ordinal, new_ordinal):
    """Modify weak bind entries to redirect ____chkstk_darwin."""
    if weak_size == 0:
        return data, 0
    
    data = bytearray(data)
    changes = 0
    pos = weak_off
    end = weak_off + weak_size
    ordinal_pos = None
    ordinal_type = None
    current_ordinal = 0
    current_sym = ""
    
    while pos < end:
        opcode = data[pos]
        immediate = opcode & 0x0F
        opcode_base = opcode & 0xF0
        
        if opcode == 0x00:  # DONE
            break
        elif opcode_base == 0x10:  # SET_DYLIB_ORDINAL_IMM
            ordinal_pos = pos
            ordinal_type = 'imm'
            current_ordinal = immediate
            pos += 1
        elif opcode_base == 0x20:  # SET_DYLIB_ORDINAL_ULEB128
            ordinal_pos = pos
            ordinal_type = 'uleb128'
            val, pos = read_uleb128(data, pos + 1)
            current_ordinal = val
        elif opcode_base == 0x40:  # SET_SYMBOL_TRAILING_FLAGS_IMM
            sym_start = pos + 1
            sym_end = data.index(b'\x00', sym_start)
            current_sym = data[sym_start:sym_end].decode('utf-8', errors='replace')
            pos = sym_end + 1
            if current_sym == '____chkstk_darwin' and current_ordinal == old_ordinal:
                if ordinal_type == 'imm' and new_ordinal <= 15:
                    data[ordinal_pos] = 0x10 | new_ordinal
                    changes += 1
                    print(f"    Changed weak bind ordinal: {old_ordinal} -> {new_ordinal}")
        elif opcode_base == 0x50:  # SET_TYPE_IMM
            pos += 1
        elif opcode_base == 0x60:  # SET_ADDEND_SLEB128
            _, pos = read_sleb128(data, pos + 1)
        elif opcode_base == 0x70:  # SET_SEGMENT_AND_OFFSET_ULEB128
            _, pos = read_uleb128(data, pos + 1)
        elif opcode_base == 0x80:  # SET_DYLIB_ORDINAL_SLEB128
            _, pos = read_sleb128(data, pos + 1)
        elif opcode_base == 0x90:  # DO_BIND
            pos += 1
        elif opcode_base == 0xA0:  # DO_BIND_ADD_ADDR_IMM_SCALED
            pos += 1
        elif opcode_base == 0xB0:  # DO_BIND_ADD_ADDR_ULEB128
            _, pos = read_uleb128(data, pos + 1)
        elif opcode_base == 0xC0:  # DO_BIND_ADD_ADDR_IMM_SCALED
            pos += 1
        elif opcode_base == 0xD0:  # DO_BIND_DO_BIND_ADD_ADDR_ULEB128
            _, pos = read_uleb128(data, pos + 1)
        elif opcode_base == 0xE0:  # DO_BIND_DO_BIND_ULEB128_TIMES_SKIPPING_ULEB128
            _, pos = read_uleb128(data, pos + 1)
            _, pos = read_uleb128(data, pos)
        else:
            pos += 1
    
    return bytes(data), changes


def patch_macho64(data, compat_lib_install_name):
    """Patch a 64-bit Mach-O binary to redirect ____chkstk_darwin."""
    magic = struct.unpack_from('<I', data, 0)[0]
    if magic != MH_MAGIC_64:
        return None
    
    if b'____chkstk_darwin' not in data:
        return None
    
    ncmds = struct.unpack_from('<I', data, 16)[0]
    sizeofcmds = struct.unpack_from('<I', data, 20)[0]
    
    # Parse load commands
    lib_ordinals = {}
    cur_ordinal = 0
    libsystem_ordinal = None
    symtab_off = 0
    symtab_nsyms = 0
    symtab_strtoff = 0
    symtab_strsize = 0
    cs_off = cs_size = 0
    cs_cmd_off = cs_cmd_size = 0
    weak_off = weak_size = 0
    bind_off = bind_size = 0
    lazy_off = lazy_size = 0
    
    cmdoff = 32
    for i in range(ncmds):
        cmd = struct.unpack_from('<I', data, cmdoff)[0]
        cmdsize = struct.unpack_from('<I', data, cmdoff + 4)[0]
        
        if cmd in DYLIB_LOAD_CMDS:
            name_offset = struct.unpack_from('<I', data, cmdoff + 8)[0]
            name_start = cmdoff + name_offset
            name_end = data.index(b'\x00', name_start)
            name = data[name_start:name_end].decode('utf-8')
            lib_ordinals[cur_ordinal] = (name, cmdoff)
            if 'libSystem' in name and libsystem_ordinal is None:
                libsystem_ordinal = cur_ordinal
            cur_ordinal += 1
        elif cmd == LC_SYMTAB:
            symtab_off = struct.unpack_from('<I', data, cmdoff + 8)[0]
            symtab_nsyms = struct.unpack_from('<I', data, cmdoff + 12)[0]
            symtab_strtoff = struct.unpack_from('<I', data, cmdoff + 16)[0]
            symtab_strsize = struct.unpack_from('<I', data, cmdoff + 20)[0]
        elif cmd == LC_DYLD_INFO_ONLY:
            bind_off = struct.unpack_from('<I', data, cmdoff + 8)[0]
            bind_size = struct.unpack_from('<I', data, cmdoff + 12)[0]
            weak_off = struct.unpack_from('<I', data, cmdoff + 16)[0]
            weak_size = struct.unpack_from('<I', data, cmdoff + 20)[0]
            lazy_off = struct.unpack_from('<I', data, cmdoff + 24)[0]
            lazy_size = struct.unpack_from('<I', data, cmdoff + 28)[0]
        elif cmd == LC_CODE_SIGNATURE:
            cs_off = struct.unpack_from('<I', data, cmdoff + 8)[0]
            cs_size = struct.unpack_from('<I', data, cmdoff + 12)[0]
            cs_cmd_off = cmdoff
            cs_cmd_size = cmdsize
        
        cmdoff += cmdsize
    
    if libsystem_ordinal is None:
        print(f"    No libSystem.B.dylib found")
        return None
    
    # Step 1: Add LC_LOAD_DYLIB for compat lib
    new_dylib_cmd = make_dylib_command(compat_lib_install_name)
    new_cmdsize = len(new_dylib_cmd)
    
    end_of_cmds = 32 + sizeofcmds
    
    # Find first section offset
    first_section_off = len(data)
    cmdoff2 = 32
    for i in range(ncmds):
        cmd = struct.unpack_from('<I', data, cmdoff2)[0]
        cmdsize2 = struct.unpack_from('<I', data, cmdoff2 + 4)[0]
        if cmd == LC_SEGMENT_64:
            nsects = struct.unpack_from('<I', data, cmdoff2 + 64)[0]
            sectoff = cmdoff2 + 72
            for j in range(nsects):
                sect_offset = struct.unpack_from('<I', data, sectoff + 48)[0]
                if sect_offset > 0 and sect_offset < first_section_off:
                    first_section_off = sect_offset
                sectoff += 80
        cmdoff2 += cmdsize2
    
    available_space = first_section_off - end_of_cmds
    
    if available_space < new_cmdsize:
        print(f"    Not enough space for LC_LOAD_DYLIB (need {new_cmdsize}, have {available_space})")
        return None
    
    data = bytearray(data)
    
    # Insert new load command at end_of_cmds
    data[end_of_cmds:end_of_cmds + new_cmdsize] = new_dylib_cmd
    
    # Update header
    new_ncmds = ncmds + 1
    new_sizeofcmds = sizeofcmds + new_cmdsize
    struct.pack_into('<I', data, 16, new_ncmds)
    struct.pack_into('<I', data, 20, new_sizeofcmds)
    
    # The new library ordinal (1-based)
    new_lib_ordinal = cur_ordinal + 1
    old_lib_ordinal_1based = libsystem_ordinal + 1
    
    print(f"    Added LC_LOAD_DYLIB for {compat_lib_install_name} (ordinal {new_lib_ordinal})")
    
    # Step 2: Change library ordinal in symbol table entries
    changes = 0
    if symtab_off > 0 and symtab_nsyms > 0:
        for i in range(symtab_nsyms):
            n_off = symtab_off + i * 16
            if n_off + 16 > len(data):
                break
            n_strx = struct.unpack_from('<I', data, n_off)[0]
            n_type = data[n_off + 4]
            
            name_off = symtab_strtoff + n_strx
            if name_off >= len(data):
                continue
            try:
                name_end = data.index(b'\x00', name_off)
                name = data[name_off:name_end].decode('utf-8', errors='replace')
            except ValueError:
                continue
            
            if name == '____chkstk_darwin':
                n_desc = struct.unpack_from('<H', data, n_off + 6)[0]
                old_ordinal = (n_desc >> 8) & 0xFF
                flags = n_desc & 0xFF
                if old_ordinal == old_lib_ordinal_1based:
                    new_desc = (new_lib_ordinal << 8) | flags
                    struct.pack_into('<H', data, n_off + 6, new_desc)
                    changes += 1
                    print(f"    Changed symbol ____chkstk_darwin n_desc ordinal: {old_ordinal} -> {new_lib_ordinal}")
    
    # Step 3: Change library ordinal in weak bind data
    if weak_off > 0 and weak_size > 0:
        data_bytes, weak_changes = patch_weak_bind(bytes(data), weak_off, weak_size, old_lib_ordinal_1based, new_lib_ordinal)
        data = bytearray(data_bytes)
        changes += weak_changes
    
    # Also check regular bind and lazy bind data
    if bind_off > 0 and bind_size > 0:
        data_bytes, bind_changes = patch_weak_bind(bytes(data), bind_off, bind_size, old_lib_ordinal_1based, new_lib_ordinal)
        data = bytearray(data_bytes)
        changes += bind_changes
    
    if lazy_off > 0 and lazy_size > 0:
        data_bytes, lazy_changes = patch_weak_bind(bytes(data), lazy_off, lazy_size, old_lib_ordinal_1based, new_lib_ordinal)
        data = bytearray(data_bytes)
        changes += lazy_changes
    
    if changes == 0:
        print(f"    WARNING: No ____chkstk_darwin symbols modified")
    
    # Step 4: Zero out code signature data (keep command header)
    if cs_off > 0 and cs_size > 0:
        data[cs_off:cs_off + cs_size] = b'\x00' * cs_size
        print(f"    Zeroed code signature data ({cs_size} bytes)")
    
    # Step 5: Patch LC_BUILD_VERSION minos to 10.13
    cmdoff4 = 32
    for i in range(new_ncmds):
        cmd = struct.unpack_from('<I', data, cmdoff4)[0]
        cmdsize4 = struct.unpack_from('<I', data, cmdoff4 + 4)[0]
        if cmdsize4 == 0:
            break
        if cmd == LC_BUILD_VERSION:
            minos = struct.unpack_from('<I', data, cmdoff4 + 12)[0]
            new_minos = (10 << 16) | (13 << 8) | 0
            struct.pack_into('<I', data, cmdoff4 + 12, new_minos)
            print(f"    Patched minos: {minos >> 16}.{minos >> 8 & 0xFF}.{minos & 0xFF} -> 10.13")
        cmdoff4 += cmdsize4
    
    return bytes(data)


def patch_fat_binary(data, compat_lib_install_name):
    magic = struct.unpack_from('>I', data, 0)[0]
    if magic not in (FAT_MAGIC, FAT_MAGIC_SWAPPED):
        return None
    
    big_endian = (magic == FAT_MAGIC)
    fmt = '>I' if big_endian else '<I'
    nfat_arch = struct.unpack_from(fmt, data, 4)[0]
    
    offset = 8
    for i in range(nfat_arch):
        if big_endian:
            cputype, cpusubtype, archoff, archsize, align = struct.unpack_from('>IIIII', data, offset)
        else:
            cputype, cpusubtype, archoff, archsize, align = struct.unpack_from('<IIIII', data, offset)
        
        if cputype == 0x01000007:  # CPU_TYPE_X86_64
            arch_magic = struct.unpack_from('<I', data, archoff)[0]
            if arch_magic == MH_MAGIC_64:
                arch_data = data[archoff:]
                result = patch_macho64(arch_data, compat_lib_install_name)
                if result:
                    data = data[:archoff] + result + data[archoff + len(result):]
                    return data
        offset += 20 if big_endian else 32
    
    return None


def patch_file(filepath, compat_lib_install_name):
    with open(filepath, 'rb') as f:
        data = f.read()
    
    magic = struct.unpack_from('<I', data, 0)[0]
    
    if magic == MH_MAGIC_64:
        result = patch_macho64(data, compat_lib_install_name)
    elif magic in (FAT_MAGIC, FAT_MAGIC_SWAPPED):
        result = patch_fat_binary(data, compat_lib_install_name)
    else:
        return False
    
    if result:
        with open(filepath, 'wb') as f:
            f.write(result)
        return True
    return False


def is_macho(filepath):
    try:
        with open(filepath, 'rb') as f:
            magic_bytes = f.read(4)
        if len(magic_bytes) < 4:
            return False
        magic_le = struct.unpack_from('<I', magic_bytes, 0)[0]
        magic_be = struct.unpack_from('>I', magic_bytes, 0)[0]
        return magic_le in (MH_MAGIC_64, MH_MAGIC) or magic_be in (FAT_MAGIC, FAT_MAGIC_SWAPPED)
    except:
        return False


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <directory_or_file> [compat_lib_install_name]")
        print(f"  Patches Mach-O files to redirect ____chkstk_darwin")
        print(f"  Default install name: @executable_path/libchkstk.dylib")
        sys.exit(1)
    
    target = sys.argv[1]
    compat_lib_install_name = sys.argv[2] if len(sys.argv) > 2 else '@executable_path/libchkstk.dylib'
    
    if os.path.isfile(target):
        print(f"Patching file: {target}")
        print(f"Install name: {compat_lib_install_name}")
        try:
            if patch_file(target, compat_lib_install_name):
                print(f"  -> Patched!")
            else:
                print(f"  -> Skipped")
        except Exception as e:
            print(f"  -> Error: {e}")
            import traceback
            traceback.print_exc()
    elif os.path.isdir(target):
        print(f"Patching directory: {target}")
        print(f"Install name: {compat_lib_install_name}")
        
        patched = 0
        failed = 0
        total = 0
        
        for root, dirs, files in os.walk(target):
            for filename in files:
                filepath = os.path.join(root, filename)
                if not is_macho(filepath):
                    continue
                total += 1
                print(f"\nProcessing: {filepath}")
                try:
                    if patch_file(filepath, compat_lib_install_name):
                        patched += 1
                        print(f"  -> Patched!")
                    else:
                        print(f"  -> Skipped")
                except Exception as e:
                    failed += 1
                    print(f"  -> Error: {e}")
                    import traceback
                    traceback.print_exc()
        
        print(f"\n{'='*60}")
        print(f"Patched {patched}/{total} files ({failed} failed)")
    else:
        print(f"Error: {target} is not a file or directory")
        sys.exit(1)
