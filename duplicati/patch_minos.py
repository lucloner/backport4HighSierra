#!/usr/bin/env python3
"""Patch Mach-O binaries to change LC_BUILD_VERSION minos from 10.15 to 10.13.

macOS 10.13's dyld understands LC_BUILD_VERSION but enforces the minimum version.
By changing minos from 10.15 to 10.13, we allow the binary to load on 10.13.
"""

import struct
import sys
import os

LC_BUILD_VERSION = 0x32  # Correct Mach-O constant (not 0x80000034!)

def encode_version(major, minor=0, patch=0):
    return (major << 16) | (minor << 8) | patch

def patch_macho64(data, offset=0):
    magic = struct.unpack_from('<I', data, offset)[0]
    if magic != 0xFEEDFACF:  # MH_MAGIC_64
        return data, False
    
    ncmds = struct.unpack_from('<I', data, offset + 16)[0]
    cmd_offset = offset + 32
    patched = False
    
    for i in range(ncmds):
        cmd = struct.unpack_from('<I', data, cmd_offset)[0]
        cmdsize = struct.unpack_from('<I', data, cmd_offset + 4)[0]
        
        if cmd == LC_BUILD_VERSION:
            minos = struct.unpack_from('<I', data, cmd_offset + 12)[0]
            sdk = struct.unpack_from('<I', data, cmd_offset + 16)[0]
            new_minos = encode_version(10, 13)
            new_sdk = encode_version(10, 14)
            print(f"    LC_BUILD_VERSION: minos={minos>>16}.{minos>>8&0xFF}.{minos&0xFF} -> 10.13, sdk={sdk>>16}.{sdk>>8&0xFF}.{sdk&0xFF} -> 10.14")
            struct.pack_into('<I', data, cmd_offset + 12, new_minos)
            struct.pack_into('<I', data, cmd_offset + 16, new_sdk)
            patched = True
        
        cmd_offset += cmdsize
    
    return data, patched

def patch_macho32(data, offset=0):
    magic = struct.unpack_from('<I', data, offset)[0]
    if magic != 0xFEEDFACE:  # MH_MAGIC
        return data, False
    
    ncmds = struct.unpack_from('<I', data, offset + 16)[0]
    cmd_offset = offset + 28
    patched = False
    
    for i in range(ncmds):
        cmd = struct.unpack_from('<I', data, cmd_offset)[0]
        cmdsize = struct.unpack_from('<I', data, cmd_offset + 4)[0]
        
        if cmd == LC_BUILD_VERSION:
            minos = struct.unpack_from('<I', data, cmd_offset + 12)[0]
            sdk = struct.unpack_from('<I', data, cmd_offset + 16)[0]
            new_minos = encode_version(10, 13)
            new_sdk = encode_version(10, 14)
            struct.pack_into('<I', data, cmd_offset + 12, new_minos)
            struct.pack_into('<I', data, cmd_offset + 16, new_sdk)
            patched = True
        
        cmd_offset += cmdsize
    
    return data, patched

def patch_fat_binary(data):
    magic = struct.unpack_from('>I', data, 0)[0]
    if magic == 0xCAFEBABE:
        nfat_arch = struct.unpack_from('>I', data, 4)[0]
        big_endian = True
    elif magic == 0xBEBAFECA:
        nfat_arch = struct.unpack_from('<I', data, 4)[0]
        big_endian = False
    else:
        return data, False
    
    patched = False
    offset = 8
    fmt = '>IIIII' if big_endian else '<IIIII'
    
    for i in range(nfat_arch):
        cputype, cpusubtype, arch_offset, arch_size, align = struct.unpack_from(fmt, data, offset)
        arch_magic = struct.unpack_from('<I', data, arch_offset)[0]
        if arch_magic == 0xFEEDFACF:
            data, p = patch_macho64(data, arch_offset)
            patched = patched or p
        elif arch_magic == 0xFEEDFACE:
            data, p = patch_macho32(data, arch_offset)
            patched = patched or p
        offset += 20 if big_endian else 32
    
    return data, patched

def patch_file(filepath):
    with open(filepath, 'rb') as f:
        data = bytearray(f.read())
    
    magic = struct.unpack_from('<I', data, 0)[0]
    
    if magic == 0xFEEDFACF:
        data, patched = patch_macho64(data)
    elif magic == 0xFEEDFACE:
        data, patched = patch_macho32(data)
    elif magic in (0xCAFEBABE, 0xBEBAFECA):
        data, patched = patch_fat_binary(data)
    else:
        return False
    
    if patched:
        with open(filepath, 'wb') as f:
            f.write(data)
        return True
    return False

def is_macho(filepath):
    try:
        with open(filepath, 'rb') as f:
            magic = f.read(4)
            return magic in (b'\xfe\xed\xfa\xce', b'\xfe\xed\xfa\xcf',
                           b'\xca\xfe\xba\xbe', b'\xbe\xba\xfe\xca',
                           b'\xce\xfa\xed\xfe', b'\xcf\xfa\xed\xfe')
    except:
        return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <path>")
        sys.exit(1)
    
    target = sys.argv[1]
    if os.path.isdir(target):
        patched = 0
        total = 0
        for root, dirs, files in os.walk(target):
            for filename in files:
                filepath = os.path.join(root, filename)
                if not is_macho(filepath):
                    continue
                total += 1
                print(f"Patching: {filepath}")
                try:
                    if patch_file(filepath):
                        patched += 1
                        print(f"  -> Patched!")
                    else:
                        print(f"  -> No LC_BUILD_VERSION found")
                except Exception as e:
                    print(f"  -> Error: {e}")
        print(f"\nPatched {patched}/{total} files")
    elif os.path.isfile(target):
        if not is_macho(target):
            print(f"Not a Mach-O file: {target}")
            sys.exit(1)
        if patch_file(target):
            print(f"Patched: {target}")
        else:
            print(f"No LC_BUILD_VERSION found: {target}")
