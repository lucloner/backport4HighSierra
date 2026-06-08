#!/usr/bin/env python3
"""Patch Mach-O binaries to replace LC_BUILD_VERSION with LC_VERSION_MIN_MACOSX.

macOS 10.13 dyld doesn't understand LC_BUILD_VERSION (0x80000034).
This script replaces LC_BUILD_VERSION with LC_VERSION_MIN_MACOSX (0x80000022)
+ LC_SOURCE_VERSION (0x8000002A) padding, and sets the minimum OS version to 10.13.

LC_BUILD_VERSION:  cmd=0x80000034, cmdsize=32, platform(4), minos(4), sdk(4), ntools(4), [tool(4),version(4)]*
LC_VERSION_MIN_MACOSX: cmd=0x80000022, cmdsize=16, version(4), sdk(4)
LC_SOURCE_VERSION:     cmd=0x8000002A, cmdsize=16, version(8)
"""

import struct
import sys
import os

LC_VERSION_MIN_MACOSX = 0x24
LC_BUILD_VERSION = 0x32
LC_SOURCE_VERSION = 0x2A

MH_MAGIC = 0xFEEDFACE
MH_MAGIC_64 = 0xFEEDFACF

def decode_version(v):
    major = (v >> 16) & 0xFFFF
    minor = (v >> 8) & 0xFF
    patch = v & 0xFF
    return f"{major}.{minor}.{patch}"

def encode_version(major, minor=0, patch=0):
    return (major << 16) | (minor << 8) | patch

def patch_macho64(data, offset=0):
    magic = struct.unpack_from('<I', data, offset)[0]
    if magic != MH_MAGIC_64:
        return data, False
    ncmds = struct.unpack_from('<I', data, offset + 16)[0]
    cmd_offset = offset + 32
    patched = False
    for i in range(ncmds):
        cmd = struct.unpack_from('<I', data, cmd_offset)[0]
        cmdsize = struct.unpack_from('<I', data, cmd_offset + 4)[0]
        if cmd == LC_BUILD_VERSION:
            platform = struct.unpack_from('<I', data, cmd_offset + 8)[0]
            minos = struct.unpack_from('<I', data, cmd_offset + 12)[0]
            sdk = struct.unpack_from('<I', data, cmd_offset + 16)[0]
            ntools = struct.unpack_from('<I', data, cmd_offset + 20)[0]
            print(f"    LC_BUILD_VERSION: platform={platform}, minos={decode_version(minos)}, sdk={decode_version(sdk)}, ntools={ntools}")
            new_version = encode_version(10, 13)
            new_sdk = encode_version(10, 14)
            version_min = struct.pack('<IIII', LC_VERSION_MIN_MACOSX, 16, new_version, new_sdk)
            source_version = struct.pack('<IIQ', LC_SOURCE_VERSION, 16, 0)
            data = data[:cmd_offset] + version_min + source_version + data[cmd_offset + 32:]
            patched = True
        cmd_offset += cmdsize
    return data, patched

def patch_macho32(data, offset=0):
    magic = struct.unpack_from('<I', data, offset)[0]
    if magic != MH_MAGIC:
        return data, False
    ncmds = struct.unpack_from('<I', data, offset + 16)[0]
    cmd_offset = offset + 28
    patched = False
    for i in range(ncmds):
        cmd = struct.unpack_from('<I', data, cmd_offset)[0]
        cmdsize = struct.unpack_from('<I', data, cmd_offset + 4)[0]
        if cmd == LC_BUILD_VERSION:
            platform = struct.unpack_from('<I', data, cmd_offset + 8)[0]
            minos = struct.unpack_from('<I', data, cmd_offset + 12)[0]
            sdk = struct.unpack_from('<I', data, cmd_offset + 16)[0]
            ntools = struct.unpack_from('<I', data, cmd_offset + 20)[0]
            print(f"    LC_BUILD_VERSION: platform={platform}, minos={decode_version(minos)}, sdk={decode_version(sdk)}, ntools={ntools}")
            new_version = encode_version(10, 13)
            new_sdk = encode_version(10, 14)
            version_min = struct.pack('<IIII', LC_VERSION_MIN_MACOSX, 16, new_version, new_sdk)
            source_version = struct.pack('<IIQ', LC_SOURCE_VERSION, 16, 0)
            data = data[:cmd_offset] + version_min + source_version + data[cmd_offset + 32:]
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
    for i in range(nfat_arch):
        if big_endian:
            cputype, cpusubtype, arch_offset, arch_size, align = struct.unpack_from('>IIIII', data, offset)
        else:
            cputype, cpusubtype, arch_offset, arch_size, align = struct.unpack_from('<IIIII', data, offset)
        arch_magic = struct.unpack_from('<I', data, arch_offset)[0]
        if arch_magic == MH_MAGIC_64:
            data, p = patch_macho64(data, arch_offset)
            patched = patched or p
        elif arch_magic == MH_MAGIC:
            data, p = patch_macho32(data, arch_offset)
            patched = patched or p
        offset += 20 if big_endian else 32
    return data, patched

def patch_file(filepath):
    with open(filepath, 'rb') as f:
        data = bytearray(f.read())
    magic = struct.unpack_from('<I', data, 0)[0]
    if magic == MH_MAGIC_64:
        data, patched = patch_macho64(data)
    elif magic == MH_MAGIC:
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

def patch_directory(dirpath):
    patched_count = 0
    total_count = 0
    for root, dirs, files in os.walk(dirpath):
        for filename in files:
            filepath = os.path.join(root, filename)
            if not is_macho(filepath):
                continue
            total_count += 1
            print(f"Patching: {filepath}")
            try:
                if patch_file(filepath):
                    patched_count += 1
                    print(f"  -> Patched!")
                else:
                    print(f"  -> No LC_BUILD_VERSION found or already patched")
            except Exception as e:
                print(f"  -> Error: {e}")
    print(f"\nPatched {patched_count}/{total_count} files")
    return patched_count

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <path>")
        sys.exit(1)
    target = sys.argv[1]
    if os.path.isdir(target):
        patch_directory(target)
    elif os.path.isfile(target):
        if not is_macho(target):
            print(f"Not a Mach-O file: {target}")
            sys.exit(1)
        if patch_file(target):
            print(f"Patched: {target}")
        else:
            print(f"No LC_BUILD_VERSION found or already patched: {target}")
