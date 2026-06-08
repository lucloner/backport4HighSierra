var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/jsc/bindings/js_classes.ts
var js_classes_default;
var init_js_classes = __esm({
  "src/jsc/bindings/js_classes.ts"() {
    "use strict";
    js_classes_default = [
      // class list for $inherits*() builtins, eg. $inheritsBlob()
      // tests if a value is an instanceof a native class in a robust cross-realm manner
      // source-of-truth impl in src/codegen/generate-classes.ts
      // result in build/debug/codegen/ZigGeneratedClasses.cpp
      ["Blob"],
      ["ReadableStream", "JSReadableStream.h"],
      ["WritableStream", "JSWritableStream.h"],
      ["TransformStream", "JSTransformStream.h"],
      ["ArrayBuffer"],
      ["CompressionStream", "JSCompressionStream.h"],
      ["DecompressionStream", "JSDecompressionStream.h"]
    ];
  }
});

// src/api/schema.js
var LoaderKeys;
var init_schema = __esm({
  "src/api/schema.js"() {
    "use strict";
    LoaderKeys = {
      "1": "jsx",
      "2": "js",
      "3": "ts",
      "4": "tsx",
      "5": "css",
      "6": "file",
      "7": "json",
      "8": "jsonc",
      "9": "toml",
      "10": "wasm",
      "11": "napi",
      "12": "base64",
      "13": "dataurl",
      "14": "text",
      "15": "bunsh",
      "16": "sqlite",
      "17": "sqlite_embedded",
      "18": "html",
      "19": "yaml",
      jsx: "jsx",
      js: "js",
      ts: "ts",
      tsx: "tsx",
      css: "css",
      file: "file",
      json: "json",
      jsonc: "jsonc",
      toml: "toml",
      wasm: "wasm",
      napi: "napi",
      base64: "base64",
      dataurl: "dataurl",
      text: "text",
      bunsh: "bunsh",
      sqlite: "sqlite",
      sqlite_embedded: "sqlite_embedded",
      html: "html",
      yaml: "yaml"
    };
  }
});

// src/jsc/bindings/ErrorCode.ts
var errors, ErrorCode_default;
var init_ErrorCode = __esm({
  "src/jsc/bindings/ErrorCode.ts"() {
    "use strict";
    errors = [
      ["ABORT_ERR", Error, "AbortError"],
      ["ERR_ACCESS_DENIED", Error],
      ["ERR_AMBIGUOUS_ARGUMENT", TypeError],
      ["ERR_ARG_NOT_ITERABLE", TypeError],
      ["ERR_ASSERTION", Error],
      ["ERR_ASYNC_CALLBACK", TypeError],
      ["ERR_ASYNC_TYPE", TypeError],
      ["ERR_BODY_ALREADY_USED", TypeError],
      ["ERR_BORINGSSL", Error],
      ["ERR_ZSTD", Error],
      ["ERR_BROTLI_INVALID_PARAM", RangeError],
      ["ERR_BUFFER_CONTEXT_NOT_AVAILABLE", Error],
      ["ERR_BUFFER_OUT_OF_BOUNDS", RangeError],
      ["ERR_BUFFER_TOO_LARGE", RangeError],
      ["ERR_CHILD_PROCESS_IPC_REQUIRED", Error],
      ["ERR_CHILD_PROCESS_STDIO_MAXBUFFER", RangeError],
      ["ERR_CLOSED_MESSAGE_PORT", Error],
      ["ERR_CONSOLE_WRITABLE_STREAM", TypeError, "TypeError"],
      ["ERR_CONSTRUCT_CALL_INVALID", TypeError],
      ["ERR_CONSTRUCT_CALL_REQUIRED", TypeError],
      ["ERR_CRYPTO_CUSTOM_ENGINE_NOT_SUPPORTED", Error],
      ["ERR_CRYPTO_ECDH_INVALID_FORMAT", TypeError],
      ["ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY", Error],
      ["ERR_CRYPTO_HASH_FINALIZED", Error],
      ["ERR_CRYPTO_HASH_UPDATE_FAILED", Error],
      ["ERR_CRYPTO_INCOMPATIBLE_KEY_OPTIONS", Error],
      ["ERR_CRYPTO_INCOMPATIBLE_KEY", Error],
      ["ERR_CRYPTO_INITIALIZATION_FAILED", Error],
      ["ERR_CRYPTO_INVALID_AUTH_TAG", TypeError],
      ["ERR_CRYPTO_INVALID_COUNTER", TypeError],
      ["ERR_CRYPTO_INVALID_CURVE", TypeError],
      ["ERR_CRYPTO_INVALID_DIGEST", TypeError],
      ["ERR_CRYPTO_INVALID_IV", TypeError],
      ["ERR_CRYPTO_INVALID_JWK", TypeError],
      ["ERR_CRYPTO_INVALID_KEY_OBJECT_TYPE", TypeError],
      ["ERR_CRYPTO_INVALID_KEYLEN", RangeError],
      ["ERR_CRYPTO_INVALID_KEYPAIR", RangeError],
      ["ERR_CRYPTO_INVALID_KEYTYPE", RangeError],
      ["ERR_CRYPTO_INVALID_MESSAGELEN", RangeError],
      ["ERR_CRYPTO_INVALID_SCRYPT_PARAMS", RangeError],
      ["ERR_CRYPTO_INVALID_STATE", Error],
      ["ERR_CRYPTO_INVALID_TAG_LENGTH", RangeError],
      ["ERR_CRYPTO_JOB_INIT_FAILED", Error],
      ["ERR_CRYPTO_JWK_UNSUPPORTED_CURVE", Error],
      ["ERR_CRYPTO_JWK_UNSUPPORTED_KEY_TYPE", Error],
      ["ERR_CRYPTO_OPERATION_FAILED", Error],
      ["ERR_CRYPTO_SCRYPT_INVALID_PARAMETER", Error],
      ["ERR_CRYPTO_SIGN_KEY_REQUIRED", Error],
      ["ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH", RangeError],
      ["ERR_CRYPTO_UNKNOWN_CIPHER", Error],
      ["ERR_CRYPTO_UNKNOWN_DH_GROUP", Error],
      ["ERR_CRYPTO_UNSUPPORTED_OPERATION", Error],
      ["ERR_DIR_CLOSED", Error],
      ["ERR_DLOPEN_DISABLED", Error],
      ["ERR_DLOPEN_FAILED", Error],
      ["ERR_DNS_SET_SERVERS_FAILED", Error],
      ["ERR_ENCODING_INVALID_ENCODED_DATA", TypeError],
      ["ERR_ENCODING_NOT_SUPPORTED", RangeError],
      ["ERR_EVENT_RECURSION", Error],
      ["ERR_EXECUTION_ENVIRONMENT_NOT_AVAILABLE", Error],
      ["ERR_FEATURE_UNAVAILABLE_ON_PLATFORM", TypeError],
      ["ERR_FORMDATA_PARSE_ERROR", TypeError],
      ["ERR_FS_CP_DIR_TO_NON_DIR", Error],
      ["ERR_FS_CP_EINVAL", Error],
      ["ERR_FS_CP_FIFO_PIPE", Error],
      ["ERR_FS_CP_NON_DIR_TO_DIR", Error],
      ["ERR_FS_CP_SOCKET", Error],
      ["ERR_FS_CP_UNKNOWN", Error],
      ["ERR_FS_EISDIR", Error],
      ["ERR_HTTP_BODY_NOT_ALLOWED", Error],
      ["ERR_HTTP_HEADERS_SENT", Error],
      ["ERR_HTTP_CONTENT_LENGTH_MISMATCH", Error],
      ["ERR_HTTP_INVALID_HEADER_VALUE", TypeError],
      ["ERR_HTTP_INVALID_STATUS_CODE", RangeError],
      ["ERR_HTTP_TRAILER_INVALID", Error],
      ["ERR_HTTP_SOCKET_ASSIGNED", Error],
      ["ERR_HTTP2_ALTSVC_INVALID_ORIGIN", TypeError],
      ["ERR_HTTP2_ALTSVC_LENGTH", TypeError],
      ["ERR_HTTP2_CONNECT_AUTHORITY", Error],
      ["ERR_HTTP2_CONNECT_SCHEME", Error],
      ["ERR_HTTP2_CONNECT_PATH", Error],
      ["ERR_HTTP2_ERROR", Error],
      ["ERR_HTTP2_HEADER_SINGLE_VALUE", TypeError],
      ["ERR_HTTP2_HEADERS_AFTER_RESPOND", Error],
      ["ERR_HTTP2_HEADERS_SENT", Error],
      ["ERR_HTTP2_INFO_STATUS_NOT_ALLOWED", RangeError],
      ["ERR_HTTP2_INVALID_HEADER_VALUE", TypeError],
      ["ERR_HTTP2_INVALID_INFO_STATUS", RangeError],
      ["ERR_HTTP2_INVALID_ORIGIN", TypeError],
      ["ERR_HTTP2_INVALID_PSEUDOHEADER", TypeError],
      ["ERR_HTTP2_INVALID_SESSION", Error],
      ["ERR_HTTP2_INVALID_STREAM", Error],
      ["ERR_HTTP2_MAX_PENDING_SETTINGS_ACK", Error],
      ["ERR_HTTP2_NO_SOCKET_MANIPULATION", Error],
      ["ERR_HTTP2_ORIGIN_LENGTH", TypeError],
      ["ERR_HTTP2_OUT_OF_STREAMS", Error],
      ["ERR_HTTP2_PAYLOAD_FORBIDDEN", Error],
      ["ERR_HTTP2_PING_CANCEL", Error],
      ["ERR_HTTP2_PING_LENGTH", RangeError],
      ["ERR_HTTP2_PSEUDOHEADER_NOT_ALLOWED", TypeError],
      ["ERR_HTTP2_PUSH_DISABLED", Error],
      ["ERR_HTTP2_SEND_FILE_NOSEEK", Error],
      ["ERR_HTTP2_SEND_FILE", Error],
      ["ERR_HTTP2_SESSION_ERROR", Error],
      ["ERR_HTTP2_SOCKET_UNBOUND", Error],
      ["ERR_HTTP2_STATUS_101", Error],
      ["ERR_HTTP2_STATUS_INVALID", RangeError],
      ["ERR_HTTP2_STREAM_ERROR", Error],
      ["ERR_HTTP2_TRAILERS_ALREADY_SENT", Error],
      ["ERR_HTTP2_TRAILERS_NOT_READY", Error],
      ["ERR_HTTP2_TOO_MANY_CUSTOM_SETTINGS", Error],
      ["ERR_HTTP2_TOO_MANY_INVALID_FRAMES", Error],
      ["ERR_HTTP2_UNSUPPORTED_PROTOCOL", Error],
      ["ERR_HTTP2_INVALID_SETTING_VALUE", TypeError, "TypeError", RangeError],
      ["ERR_ILLEGAL_CONSTRUCTOR", TypeError],
      ["ERR_INCOMPATIBLE_OPTION_PAIR", TypeError],
      ["ERR_INVALID_ADDRESS", Error],
      ["ERR_INVALID_ADDRESS_FAMILY", RangeError],
      ["ERR_INVALID_ARG_TYPE", TypeError],
      ["ERR_INVALID_ARG_VALUE", TypeError],
      ["ERR_INVALID_ASYNC_ID", RangeError],
      ["ERR_INVALID_CHAR", TypeError],
      ["ERR_INVALID_CURSOR_POS", TypeError],
      ["ERR_INVALID_FD_TYPE", TypeError],
      ["ERR_INVALID_FILE_URL_HOST", TypeError],
      ["ERR_INVALID_FILE_URL_PATH", TypeError],
      ["ERR_INVALID_HANDLE_TYPE", TypeError],
      ["ERR_INVALID_HTTP_TOKEN", TypeError],
      ["ERR_INVALID_IP_ADDRESS", TypeError],
      ["ERR_INVALID_MIME_SYNTAX", TypeError],
      ["ERR_INVALID_MODULE", Error],
      ["ERR_INVALID_OBJECT_DEFINE_PROPERTY", TypeError],
      ["ERR_INVALID_PACKAGE_CONFIG", Error],
      ["ERR_INVALID_PROTOCOL", TypeError],
      ["ERR_INVALID_RETURN_VALUE", TypeError],
      ["ERR_INVALID_STATE", Error, void 0, TypeError, RangeError],
      ["ERR_INVALID_THIS", TypeError],
      ["ERR_INVALID_URI", URIError],
      ["ERR_INVALID_URL_SCHEME", TypeError],
      ["ERR_INVALID_URL", TypeError],
      ["ERR_IP_BLOCKED", Error],
      ["ERR_IPC_CHANNEL_CLOSED", Error],
      ["ERR_IPC_DISCONNECTED", Error],
      ["ERR_IPC_ONE_PIPE", Error],
      ["ERR_LOAD_SQLITE_EXTENSION", Error],
      ["ERR_MEMORY_ALLOCATION_FAILED", Error],
      ["ERR_MESSAGE_TARGET_CONTEXT_UNAVAILABLE", Error],
      ["ERR_METHOD_NOT_IMPLEMENTED", Error],
      ["ERR_MISSING_ARGS", TypeError],
      ["ERR_MISSING_PASSPHRASE", TypeError],
      ["ERR_MISSING_PLATFORM_FOR_WORKER", Error],
      ["ERR_MODULE_NOT_FOUND", Error],
      ["ERR_MULTIPLE_CALLBACK", Error],
      ["ERR_NON_CONTEXT_AWARE_DISABLED", Error],
      ["ERR_OUT_OF_RANGE", RangeError],
      ["ERR_PARSE_ARGS_INVALID_OPTION_VALUE", TypeError],
      ["ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL", TypeError],
      ["ERR_PARSE_ARGS_UNKNOWN_OPTION", TypeError],
      ["ERR_POSTGRES_AUTHENTICATION_FAILED_PBKDF2", Error, "PostgresError"],
      ["ERR_POSTGRES_CONNECTION_CLOSED", Error, "PostgresError"],
      ["ERR_POSTGRES_CONNECTION_TIMEOUT", Error, "PostgresError"],
      ["ERR_POSTGRES_EXPECTED_REQUEST", Error, "PostgresError"],
      ["ERR_POSTGRES_EXPECTED_STATEMENT", Error, "PostgresError"],
      ["ERR_POSTGRES_IDLE_TIMEOUT", Error, "PostgresError"],
      ["ERR_POSTGRES_INVALID_BACKEND_KEY_DATA", TypeError, "PostgresError"],
      ["ERR_POSTGRES_INVALID_BINARY_DATA", TypeError, "PostgresError"],
      ["ERR_POSTGRES_INVALID_BYTE_SEQUENCE_FOR_ENCODING", TypeError, "PostgresError"],
      ["ERR_POSTGRES_INVALID_BYTE_SEQUENCE", TypeError, "PostgresError"],
      ["ERR_POSTGRES_INVALID_CHARACTER", TypeError, "PostgresError"],
      ["ERR_POSTGRES_INVALID_MESSAGE_LENGTH", Error, "PostgresError"],
      ["ERR_POSTGRES_INVALID_MESSAGE", Error, "PostgresError"],
      ["ERR_POSTGRES_INVALID_QUERY_BINDING", Error, "PostgresError"],
      ["ERR_POSTGRES_INVALID_SERVER_KEY", Error, "PostgresError"],
      ["ERR_POSTGRES_INVALID_SERVER_SIGNATURE", Error, "PostgresError"],
      ["ERR_POSTGRES_INVALID_TRANSACTION_STATE", Error, "PostgresError"],
      ["ERR_POSTGRES_LIFETIME_TIMEOUT", Error, "PostgresError"],
      ["ERR_POSTGRES_MULTIDIMENSIONAL_ARRAY_NOT_SUPPORTED_YET", Error, "PostgresError"],
      ["ERR_POSTGRES_NOT_TAGGED_CALL", Error, "PostgresError"],
      ["ERR_POSTGRES_NULLS_IN_ARRAY_NOT_SUPPORTED_YET", Error, "PostgresError"],
      ["ERR_POSTGRES_OVERFLOW", TypeError, "PostgresError"],
      ["ERR_POSTGRES_QUERY_CANCELLED", Error, "PostgresError"],
      ["ERR_POSTGRES_SASL_SIGNATURE_INVALID_BASE64", Error, "PostgresError"],
      ["ERR_POSTGRES_SASL_SIGNATURE_MISMATCH", Error, "PostgresError"],
      ["ERR_POSTGRES_SERVER_ERROR", Error, "PostgresError"],
      ["ERR_POSTGRES_SYNTAX_ERROR", SyntaxError, "PostgresError"],
      ["ERR_POSTGRES_TLS_NOT_AVAILABLE", Error, "PostgresError"],
      ["ERR_POSTGRES_TLS_UPGRADE_FAILED", Error, "PostgresError"],
      ["ERR_POSTGRES_UNEXPECTED_MESSAGE", Error, "PostgresError"],
      ["ERR_POSTGRES_UNKNOWN_AUTHENTICATION_METHOD", Error, "PostgresError"],
      ["ERR_POSTGRES_UNKNOWN_FORMAT_CODE", Error, "PostgresError"],
      ["ERR_POSTGRES_UNSAFE_TRANSACTION", Error, "PostgresError"],
      ["ERR_POSTGRES_UNSUPPORTED_ARRAY_FORMAT", TypeError, "PostgresError"],
      ["ERR_POSTGRES_UNSUPPORTED_AUTHENTICATION_METHOD", Error, "PostgresError"],
      ["ERR_POSTGRES_UNSUPPORTED_BYTEA_FORMAT", TypeError, "PostgresError"],
      ["ERR_POSTGRES_UNSUPPORTED_INTEGER_SIZE", TypeError, "PostgresError"],
      ["ERR_POSTGRES_UNSUPPORTED_NUMERIC_FORMAT", TypeError, "PostgresError"],
      ["ERR_PROXY_INVALID_CONFIG", Error],
      ["ERR_MYSQL_CONNECTION_CLOSED", Error, "MySQLError"],
      ["ERR_MYSQL_CONNECTION_TIMEOUT", Error, "MySQLError"],
      ["ERR_MYSQL_IDLE_TIMEOUT", Error, "MySQLError"],
      ["ERR_MYSQL_LIFETIME_TIMEOUT", Error, "MySQLError"],
      ["ERR_UNHANDLED_REJECTION", Error, "UnhandledPromiseRejection"],
      ["ERR_REQUIRE_ASYNC_MODULE", Error],
      ["ERR_S3_INVALID_ENDPOINT", Error],
      ["ERR_S3_INVALID_METHOD", Error],
      ["ERR_S3_INVALID_PATH", Error],
      ["ERR_S3_INVALID_SESSION_TOKEN", Error],
      ["ERR_S3_INVALID_SIGNATURE", Error],
      ["ERR_S3_MISSING_CREDENTIALS", Error],
      ["ERR_SCRIPT_EXECUTION_INTERRUPTED", Error],
      ["ERR_SCRIPT_EXECUTION_TIMEOUT", Error],
      ["ERR_SERVER_ALREADY_LISTEN", Error],
      ["ERR_SERVER_NOT_RUNNING", Error],
      ["ERR_SOCKET_ALREADY_BOUND", Error],
      ["ERR_SOCKET_BAD_BUFFER_SIZE", TypeError],
      ["ERR_SOCKET_BAD_PORT", RangeError],
      ["ERR_SOCKET_BAD_TYPE", TypeError],
      ["ERR_SOCKET_CLOSED_BEFORE_CONNECTION", Error],
      ["ERR_SOCKET_CLOSED", Error],
      ["ERR_SOCKET_CONNECTION_TIMEOUT", Error],
      ["ERR_SOCKET_DGRAM_IS_CONNECTED", Error],
      ["ERR_SOCKET_DGRAM_NOT_CONNECTED", Error],
      ["ERR_SOCKET_DGRAM_NOT_RUNNING", Error],
      ["ERR_SSR_RESPONSE_EXPECTED", Error],
      ["ERR_STREAM_ALREADY_FINISHED", Error],
      ["ERR_STREAM_CANNOT_PIPE", Error],
      ["ERR_STREAM_DESTROYED", Error],
      ["ERR_STREAM_NULL_VALUES", TypeError],
      ["ERR_STREAM_PREMATURE_CLOSE", Error],
      ["ERR_STREAM_PUSH_AFTER_EOF", Error],
      ["ERR_STREAM_RELEASE_LOCK", Error, "AbortError"],
      ["ERR_STREAM_UNABLE_TO_PIPE", Error],
      ["ERR_STREAM_UNSHIFT_AFTER_END_EVENT", Error],
      ["ERR_STREAM_WRAP", Error],
      ["ERR_STREAM_WRITE_AFTER_END", Error],
      ["ERR_STRING_TOO_LONG", Error],
      ["ERR_TLS_CERT_ALTNAME_FORMAT", SyntaxError],
      ["ERR_TLS_CERT_ALTNAME_INVALID", Error],
      ["ERR_TLS_HANDSHAKE_TIMEOUT", Error],
      ["ERR_TLS_INVALID_PROTOCOL_METHOD", TypeError],
      ["ERR_TLS_INVALID_PROTOCOL_VERSION", TypeError],
      ["ERR_TLS_PROTOCOL_VERSION_CONFLICT", TypeError],
      ["ERR_TLS_PSK_SET_IDENTITY_HINT_FAILED", Error],
      ["ERR_TLS_RENEGOTIATION_DISABLED", Error],
      ["ERR_TLS_SNI_FROM_SERVER", Error],
      ["ERR_TLS_ALPN_CALLBACK_WITH_PROTOCOLS", TypeError],
      ["ERR_SSL_NO_CIPHER_MATCH", Error],
      ["ERR_UNAVAILABLE_DURING_EXIT", Error],
      ["ERR_UNCAUGHT_EXCEPTION_CAPTURE_ALREADY_SET", Error],
      ["ERR_UNESCAPED_CHARACTERS", TypeError],
      ["ERR_UNHANDLED_ERROR", Error],
      ["ERR_UNKNOWN_CREDENTIAL", Error],
      ["ERR_UNKNOWN_ENCODING", TypeError],
      ["ERR_UNKNOWN_SIGNAL", TypeError],
      ["ERR_ZSTD_INVALID_PARAM", RangeError],
      ["ERR_USE_AFTER_CLOSE", Error],
      ["ERR_WASI_NOT_STARTED", Error],
      ["ERR_WEBASSEMBLY_RESPONSE", TypeError],
      ["ERR_WORKER_INIT_FAILED", Error],
      ["ERR_WORKER_NOT_RUNNING", Error],
      ["ERR_WORKER_UNSUPPORTED_OPERATION", TypeError],
      ["ERR_ZLIB_INITIALIZATION_FAILED", Error],
      ["MODULE_NOT_FOUND", Error],
      ["ERR_INTERNAL_ASSERTION", Error],
      ["ERR_OSSL_EVP_INVALID_DIGEST", Error],
      ["ERR_KEY_GENERATION_JOB_FAILED", Error],
      ["ERR_MISSING_OPTION", TypeError],
      ["ERR_REDIS_AUTHENTICATION_FAILED", Error, "RedisError"],
      ["ERR_REDIS_CONNECTION_CLOSED", Error, "RedisError"],
      ["ERR_REDIS_CONNECTION_TIMEOUT", Error, "RedisError"],
      ["ERR_REDIS_IDLE_TIMEOUT", Error, "RedisError"],
      ["ERR_REDIS_INVALID_ARGUMENT", Error, "RedisError"],
      ["ERR_REDIS_INVALID_ARRAY", Error, "RedisError"],
      ["ERR_REDIS_INVALID_BULK_STRING", Error, "RedisError"],
      ["ERR_REDIS_INVALID_COMMAND", Error, "RedisError"],
      ["ERR_REDIS_INVALID_DATABASE", Error, "RedisError"],
      ["ERR_REDIS_INVALID_ERROR_STRING", Error, "RedisError"],
      ["ERR_REDIS_INVALID_INTEGER", Error, "RedisError"],
      ["ERR_REDIS_INVALID_PASSWORD", Error, "RedisError"],
      ["ERR_REDIS_INVALID_RESPONSE", Error, "RedisError"],
      ["ERR_REDIS_INVALID_RESPONSE_TYPE", Error, "RedisError"],
      ["ERR_REDIS_INVALID_SIMPLE_STRING", Error, "RedisError"],
      ["ERR_REDIS_INVALID_STATE", Error, "RedisError"],
      ["ERR_REDIS_INVALID_USERNAME", Error, "RedisError"],
      ["ERR_REDIS_TLS_NOT_AVAILABLE", Error, "RedisError"],
      ["ERR_REDIS_TLS_UPGRADE_FAILED", Error, "RedisError"],
      ["HPE_UNEXPECTED_CONTENT_LENGTH", Error],
      ["HPE_INVALID_TRANSFER_ENCODING", Error],
      ["HPE_INVALID_EOF_STATE", Error],
      ["HPE_INVALID_METHOD", Error],
      ["HPE_INTERNAL", Error],
      ["ERR_VM_MODULE_STATUS", Error],
      ["ERR_VM_MODULE_ALREADY_LINKED", Error],
      ["ERR_VM_MODULE_CANNOT_CREATE_CACHED_DATA", Error],
      ["ERR_VM_MODULE_NOT_MODULE", Error],
      ["ERR_VM_MODULE_DIFFERENT_CONTEXT", Error],
      ["ERR_VM_MODULE_LINK_FAILURE", Error],
      ["ERR_VM_MODULE_CACHED_DATA_REJECTED", Error],
      ["ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING", TypeError],
      ["HPE_INVALID_HEADER_TOKEN", Error],
      ["HPE_HEADER_OVERFLOW", Error],
      ["ERR_SECRETS_NOT_AVAILABLE", Error],
      ["ERR_SECRETS_NOT_FOUND", Error],
      ["ERR_SECRETS_ACCESS_DENIED", Error],
      ["ERR_SECRETS_PLATFORM_ERROR", Error],
      ["ERR_SECRETS_USER_CANCELED", Error],
      ["ERR_SECRETS_INTERACTION_NOT_ALLOWED", Error],
      ["ERR_SECRETS_AUTH_FAILED", Error],
      ["ERR_SECRETS_INTERACTION_REQUIRED", Error]
    ];
    ErrorCode_default = errors;
  }
});

// src/codegen/helpers.ts
import fs from "node:fs";
import path from "path";
function fmtCPPCharArray(str, nullTerminated = true) {
  const normalized = str + "\n";
  var remain = normalized;
  const chars = "{" + remain.split("").map((a) => a.charCodeAt(0)).join(",") + (nullTerminated ? ",0" : "") + "}";
  return [chars, normalized.length + (nullTerminated ? 1 : 0)];
}
function addCPPCharArray(str, nullTerminated = true) {
  const normalized = str.trim() + "\n";
  return normalized.split("").map((a) => a.charCodeAt(0)).join(",") + (nullTerminated ? ",0" : "");
}
function declareASCIILiteral(name, value) {
  const [chars, count] = fmtCPPCharArray(value, true);
  return `static constexpr const char ${name}Bytes[${count}] = ${chars};
static constexpr ASCIILiteral ${name} = ASCIILiteral::fromLiteralUnsafe(${name}Bytes);`;
}
function cap(str) {
  return str[0].toUpperCase() + str.slice(1);
}
function low(str) {
  if (str.startsWith("JS")) {
    return "js" + str.slice(2);
  }
  return str[0].toLowerCase() + str.slice(1);
}
function readdirRecursive(root) {
  const files2 = fs.readdirSync(root, { withFileTypes: true });
  return files2.flatMap((file) => {
    const fullPath = path.join(root, file.name);
    return file.isDirectory() ? readdirRecursive(fullPath) : fullPath;
  });
}
function resolveSyncOrNull(specifier, from) {
  try {
    if (typeof Bun !== "undefined" && typeof Bun.resolveSync === "function") {
      return Bun.resolveSync(specifier, from);
    }
    return __require("node:module").createRequire(from).resolve(specifier);
  } catch {
    return null;
  }
}
function writeIfNotChanged(file, contents) {
  if (Array.isArray(contents)) contents = contents.join("");
  contents = contents.replaceAll("\r\n", "\n").trim() + "\n";
  try {
    const oldContents = fs.readFileSync(file, "utf8");
    if (oldContents === contents) {
      return;
    }
  } catch (e) {
  }
  try {
    fs.writeFileSync(file, contents);
  } catch (error) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
  }
  if (fs.readFileSync(file, "utf8") !== contents) {
    throw new Error(`Failed to write file ${file}`);
  }
}
function readdirRecursiveWithExclusionsAndExtensionsSync(dir, exclusions, exts) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    if (exclusions.includes(entry.name)) return [];
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? readdirRecursiveWithExclusionsAndExtensionsSync(fullPath, exclusions, exts) : exts.some((ext) => fullPath.endsWith(ext)) ? fullPath : [];
  });
}
function pathToUpperSnakeCase(filepath) {
  return filepath.replace(/^.*?:/, "").split(/[-_./\\]/g).join("_").toUpperCase();
}
var init_helpers = __esm({
  "src/codegen/helpers.ts"() {
    "use strict";
  }
});

// src/codegen/generate-js2native.ts
import path2, { basename, sep } from "path";
function callBaseName(x) {
  return x.split(/[^A-Za-z0-9]/g).pop();
}
function resolveNativeFileId(call_type, filename) {
  const ext = call_type === "bind" ? ".bind.ts" : `.${call_type}`;
  if (!filename.endsWith(ext)) {
    throw new Error(`Expected filename for $${call_type} to have ${ext} extension, got ${JSON.stringify(filename)}`);
  }
  filename = filename.replaceAll("/", sep);
  const resolved = sourceFiles.find((file) => file.endsWith(sep + filename));
  if (!resolved) {
    const fnName = call_type === "bind" ? "bindgenFn" : call_type;
    throw new Error(`Could not find file ${filename} in $${fnName} call`);
  }
  if (call_type === "zig") {
    return resolved;
  }
  return filename;
}
function registerNativeCall(call_type, filename, symbol2, create_fn_len) {
  const resolved_filename = resolveNativeFileId(call_type, filename);
  const maybe_wrapped_symbol = create_fn_len != null ? "js2native_wrap_" + symbol2.replace(/[^A-Za-z]/g, "_") : symbol2;
  const existing = nativeCalls.find(
    (call) => call.is_wrapped == (create_fn_len != null) && call.filename === resolved_filename && call.symbol === maybe_wrapped_symbol
  );
  if (existing) {
    return existing.id;
  }
  const id = nativeCalls.length;
  nativeCalls.push({
    id,
    type: create_fn_len != null ? "cpp" : call_type,
    filename: resolved_filename,
    symbol: maybe_wrapped_symbol,
    is_wrapped: create_fn_len != null
  });
  if (create_fn_len != null) {
    wrapperCalls.push({
      type: call_type,
      wrap_kind: "new-function",
      symbol_target: symbol2,
      symbol_generated: "js2native_wrap_" + symbol2.replace(/[^A-Za-z]/g, "_"),
      display_name: callBaseName(symbol2),
      call_length: create_fn_len,
      filename: resolved_filename
    });
  }
  return id;
}
function symbol(call) {
  return call.type === "zig" ? `JS2Zig__${call.filename ? normalizeSymbolPathPrefix(call.filename) + "_" : ""}${call.symbol.replace(/[^A-Za-z]/g, "_")}` : call.symbol;
}
function normalizeSymbolPathPrefix(input) {
  input = path2.resolve(input);
  const bunDir = path2.resolve(path2.join("/Volumes/Data/src/bun/src/codegen", "..", ".."));
  if (input.startsWith(bunDir)) {
    input = input.slice(bunDir.length);
  }
  return input.replaceAll(".zig", "_zig_").replace(/[^A-Za-z]/g, "_");
}
function getJS2NativeCPP() {
  const files2 = [
    ...new Set(nativeCalls.filter((x) => x.filename.endsWith(".cpp")).map((x) => x.filename.replace(/.cpp$/, ".h")))
  ];
  const externs = [];
  const nativeCallStrings = nativeCalls.filter((x) => x.type === "zig").flatMap(
    (call) => (externs.push(`extern "C" SYSV_ABI JSC::EncodedJSValue ${symbol(call)}_workaround(Zig::GlobalObject*);
`), [
      `static ALWAYS_INLINE JSC::JSValue ${symbol(call)}(Zig::GlobalObject* global) {`,
      `    return JSValue::decode(${symbol(call)}_workaround(global));`,
      `}

`
    ])
  );
  const wrapperCallStrings = wrapperCalls.map((x) => {
    if (x.wrap_kind === "new-function") {
      return [
        (x.type === "zig" && externs.push(
          `BUN_DECLARE_HOST_FUNCTION(${symbol({
            type: "zig",
            symbol: x.symbol_target,
            filename: x.filename
          })});`
        ), "") || "",
        `static ALWAYS_INLINE JSC::JSValue ${x.symbol_generated}(Zig::GlobalObject* globalObject) {`,
        `  return JSC::JSFunction::create(globalObject->vm(), globalObject, ${x.call_length}, ${JSON.stringify(
          x.display_name
        )}_s, ${symbol({
          type: x.type,
          symbol: x.symbol_target,
          filename: x.filename
        })}, JSC::ImplementationVisibility::Public);`,
        `}`
      ].join("\n");
    }
    throw new Error(`Unknown wrap kind ${x.wrap_kind}`);
  });
  return [
    `#pragma once`,
    `#include "root.h"`,
    ...files2.map((filename) => `#include ${JSON.stringify(filename)}`),
    ...externs,
    "\nnamespace JS2NativeGenerated {",
    "using namespace Bun;",
    "using namespace JSC;",
    "using namespace WebCore;\n",
    ...nativeCallStrings,
    ...wrapperCallStrings,
    ...nativeCalls.filter((x) => x.type === "bind").map(
      (x) => `extern "C" SYSV_ABI JSC::EncodedJSValue js2native_bindgen_${basename(x.filename.replace(/\.bind\.ts$/, ""))}_${x.symbol}(Zig::GlobalObject*);`
    ),
    `typedef JSC::JSValue (*JS2NativeFunction)(Zig::GlobalObject*);`,
    `static ALWAYS_INLINE JSC::JSValue callJS2Native(int32_t index, Zig::GlobalObject* global) {`,
    ` switch(index) {`,
    ...nativeCalls.map(
      (x) => `    case ${x.id}: return ${x.type === "bind" ? `JSC::JSValue::decode(js2native_bindgen_${basename(x.filename.replace(/\.bind\.ts$/, ""))}_${x.symbol}(global))` : `${symbol(x)}(global)`};`
    ),
    `    default:`,
    `      __builtin_unreachable();`,
    `  }`,
    `}`,
    `#define JS2NATIVE_COUNT ${nativeCalls.length}`,
    "}"
  ].join("\n");
}
function getJS2NativeZig(gs2NativeZigPath) {
  return [
    "//! This file is generated by src/codegen/generate-js2native.ts based on seen calls to the $zig() JS macro",
    `const bun = @import("bun");`,
    `const jsc = bun.jsc;`,
    ...nativeCalls.filter((x) => x.type === "zig").flatMap((call) => [
      `export fn ${symbol(call)}_workaround(global: *jsc.JSGlobalObject) callconv(jsc.conv) jsc.JSValue {`,
      `  return jsc.toJSHostCall(global, @src(), @import(${JSON.stringify(path2.relative(path2.dirname(gs2NativeZigPath), call.filename))}).${call.symbol}, .{global});`,
      "}"
    ]),
    ...wrapperCalls.filter((x) => x.type === "zig").flatMap((x) => [
      `export fn ${symbol({
        type: "zig",
        symbol: x.symbol_target,
        filename: x.filename
      })}(global: *jsc.JSGlobalObject, call_frame: *jsc.CallFrame) callconv(jsc.conv) jsc.JSValue {`,
      `    const function = @import(${JSON.stringify(path2.relative(path2.dirname(gs2NativeZigPath), x.filename))});`,
      `    return @call(bun.callmod_inline, jsc.toJSHostFn(function.${x.symbol_target}), .{global, call_frame});`,
      "}"
    ]),
    "comptime {",
    ...nativeCalls.filter((x) => x.type === "bind").flatMap((x) => {
      const base = basename(x.filename.replace(/\.bind\.ts$/, ""));
      return [
        `    @export(&bun.gen.${base}.create${cap(x.symbol)}Callback, .{ .name = ${JSON.stringify(
          `js2native_bindgen_${base}_${x.symbol}`
        )} });`
      ];
    }),
    "}"
  ].join("\n");
}
function getJS2NativeDTS() {
  return [
    "declare type NativeFilenameCPP = " + sourceFiles.filter((x) => x.endsWith("cpp")).map((x) => JSON.stringify(basename(x))).join("|"),
    "declare type NativeFilenameZig = " + sourceFiles.filter((x) => x.endsWith("zig")).map((x) => JSON.stringify(basename(x))).join("|"),
    ""
  ].join("\n");
}
var nativeCalls, wrapperCalls, sourceFiles;
var init_generate_js2native = __esm({
  "src/codegen/generate-js2native.ts"() {
    "use strict";
    init_helpers();
    nativeCalls = [];
    wrapperCalls = [];
    sourceFiles = readdirRecursiveWithExclusionsAndExtensionsSync(
      path2.join("/Volumes/Data/src/bun/src/codegen", "../"),
      ["deps", "node_modules", "WebKit"],
      [".cpp", ".zig", ".bind.ts"]
    );
  }
});

// src/codegen/replacements.ts
function applyReplacements(src, length) {
  let slice = src.slice(0, length);
  let rest = src.slice(length);
  slice = slice.replace(/([^a-zA-Z0-9_\$])\$([a-zA-Z0-9_]+\b)/gm, `$1__intrinsic__$2`);
  for (const replacement of replacements) {
    slice = slice.replace(
      replacement.from,
      replacement.toRaw ?? replacement.to.replaceAll("$", "__intrinsic__").replaceAll("%", "$")
    );
  }
  let match;
  if ((match = slice.match(function_regexp)) && rest.startsWith("(")) {
    const name = match[1];
    if (name === "debug") {
      const innerSlice = sliceSourceCode(rest, true);
      return [
        slice.slice(0, match.index) + "(IS_BUN_DEVELOPMENT?$debug_log" + innerSlice.result + ":void 0)",
        innerSlice.rest,
        true
      ];
    } else if (name === "assert") {
      const checkSlice = sliceSourceCode(rest, true, void 0, true);
      let rest2 = checkSlice.rest;
      let extraArgs = "";
      if (checkSlice.result.at(-1) === ",") {
        const sliced = sliceSourceCode("(" + rest2.slice(1), true, void 0, false);
        extraArgs = ", " + sliced.result.slice(1, -1);
        rest2 = sliced.rest;
      }
      return [
        slice.slice(0, match.index) + "!(IS_BUN_DEVELOPMENT?$assert(" + checkSlice.result.slice(1, -1) + "," + JSON.stringify(
          checkSlice.result.slice(1, -1).replace(/__intrinsic__/g, "$").trim()
        ) + extraArgs + "):void 0)",
        rest2,
        true
      ];
    } else if (["zig", "cpp", "newZigFunction", "newCppFunction"].includes(name)) {
      const kind = name.includes("ig") ? "zig" : "cpp";
      const is_create_fn = name.startsWith("new");
      const inner = sliceSourceCode(rest, true);
      let args;
      try {
        const str = "[" + inner.result.slice(1, -1).replaceAll("'", '"').replace(/,[\s\n]*$/s, "") + "]";
        args = JSON.parse(str);
      } catch {
        throw new Error(`Call is not known at bundle-time: '$${name}${inner.result}'`);
      }
      if (args.length != (is_create_fn ? 3 : 2) || typeof args[0] !== "string" || typeof args[1] !== "string" || is_create_fn && typeof args[2] !== "number") {
        if (is_create_fn) {
          throw new Error(`$${name} takes three arguments, but got '$${name}${inner.result}'`);
        } else {
          throw new Error(`$${name} takes two string arguments, but got '$${name}${inner.result}'`);
        }
      }
      const id = registerNativeCall(kind, args[0], args[1], is_create_fn ? args[2] : null);
      return [slice.slice(0, match.index) + "__intrinsic__lazy(" + id + ")", inner.rest, true];
    } else if (name === "isPromiseFulfilled") {
      const inner = sliceSourceCode(rest, true);
      let args;
      if (debug) {
        args = `($assert(__intrinsic__isPromise(__intrinsic__lazy.temp=${inner.result.slice(0, -1)}))),(__intrinsic__getPromiseInternalField(__intrinsic__lazy.temp, __intrinsic__promiseFieldFlags) & __intrinsic__promiseStateMask) === (__intrinsic__lazy.temp = undefined, __intrinsic__promiseStateFulfilled))`;
      } else {
        args = `((__intrinsic__getPromiseInternalField(${inner.result.slice(0, -1)}), __intrinsic__promiseFieldFlags) & __intrinsic__promiseStateMask) === __intrinsic__promiseStateFulfilled)`;
      }
      return [slice.slice(0, match.index) + args, inner.rest, true];
    } else if (name === "isPromiseRejected") {
      const inner = sliceSourceCode(rest, true);
      let args;
      if (debug) {
        args = `($assert(__intrinsic__isPromise(__intrinsic__lazy.temp=${inner.result.slice(0, -1)}))),(__intrinsic__getPromiseInternalField(__intrinsic__lazy.temp, __intrinsic__promiseFieldFlags) & __intrinsic__promiseStateMask) === (__intrinsic__lazy.temp = undefined, __intrinsic__promiseStateRejected))`;
      } else {
        args = `((__intrinsic__getPromiseInternalField(${inner.result.slice(0, -1)}), __intrinsic__promiseFieldFlags) & __intrinsic__promiseStateMask) === __intrinsic__promiseStateRejected)`;
      }
      return [slice.slice(0, match.index) + args, inner.rest, true];
    } else if (name === "isPromisePending") {
      const inner = sliceSourceCode(rest, true);
      let args;
      if (debug) {
        args = `($assert(__intrinsic__isPromise(__intrinsic__lazy.temp=${inner.result.slice(0, -1)}))),(__intrinsic__getPromiseInternalField(__intrinsic__lazy.temp, __intrinsic__promiseFieldFlags) & __intrinsic__promiseStateMask) === (__intrinsic__lazy.temp = undefined, __intrinsic__promiseStatePending))`;
      } else {
        args = `((__intrinsic__getPromiseInternalField(${inner.result.slice(0, -1)}), __intrinsic__promiseFieldFlags) & __intrinsic__promiseStateMask) === __intrinsic__promiseStatePending)`;
      }
      return [slice.slice(0, match.index) + args, inner.rest, true];
    } else if (name === "bindgenFn") {
      const inner = sliceSourceCode(rest, true);
      let args;
      try {
        const str = "[" + inner.result.slice(1, -1).replaceAll("'", '"').replace(/,[\s\n]*$/s, "") + "]";
        args = JSON.parse(str);
      } catch {
        throw new Error(`Call is not known at bundle-time: '$${name}${inner.result}'`);
      }
      if (args.length != 2 || typeof args[0] !== "string" || typeof args[1] !== "string") {
        throw new Error(`$${name} takes two string arguments, but got '$${name}${inner.result}'`);
      }
      const id = registerNativeCall("bind", args[0], args[1], null);
      return [slice.slice(0, match.index) + "__intrinsic__lazy(" + id + ")", inner.rest, true];
    } else {
      throw new Error("Unknown preprocessor macro " + name);
    }
  }
  return [slice, rest, false];
}
function applyGlobalReplacements(src) {
  let result = src;
  for (const replacement of globalReplacements) {
    result = result.replace(replacement.from, replacement.toRaw ?? replacement.to.replaceAll("$", "__intrinsic__"));
  }
  return result;
}
var replacements, error_i, globalReplacements, globalsToPrefix, enums, debug, define, function_replacements, function_regexp;
var init_replacements = __esm({
  "src/codegen/replacements.ts"() {
    "use strict";
    init_schema();
    init_ErrorCode();
    init_js_classes();
    init_builtin_parser();
    init_generate_js2native();
    replacements = [
      { from: /\bthrow new TypeError\b/g, to: "$throwTypeError" },
      { from: /\bthrow new RangeError\b/g, to: "$throwRangeError" },
      { from: /\bthrow new OutOfMemoryError\b/g, to: "$throwOutOfMemoryError" },
      { from: /\bnew TypeError\b/g, to: "$makeTypeError" },
      { from: /\bexport\s*default/g, to: "$exports =" }
    ];
    error_i = 0;
    for (let i = 0; i < ErrorCode_default.length; i++) {
      const [code, _constructor, _name, ...other_constructors] = ErrorCode_default[i];
      replacements.push({
        from: new RegExp(`\\b\\__intrinsic__${code}\\(`, "g"),
        to: `$makeErrorWithCode(${error_i}, `
      });
      error_i += 1;
      for (const con of other_constructors) {
        if (con == null) continue;
        replacements.push({
          from: new RegExp(`\\b\\__intrinsic__${code}_${con.name}\\(`, "g"),
          to: `$makeErrorWithCode(${error_i}, `
        });
        error_i += 1;
      }
    }
    for (let id = 0; id < js_classes_default.length; id++) {
      const name = js_classes_default[id][0];
      replacements.push({
        from: new RegExp(`\\b\\__intrinsic__inherits${name}\\(`, "g"),
        to: `$inherits(${id}, `
      });
    }
    globalReplacements = [
      {
        from: /\bnotImplementedIssue\(\s*([0-9]+)\s*,\s*((?:"[^"]*"|'[^']+'))\s*\)/g,
        toRaw: "__intrinsic__makeTypeError(`${$2} is not implemented yet. See https://github.com/oven-sh/bun/issues/$1`)"
      },
      {
        from: /\bnotImplementedIssueFn\(\s*([0-9]+)\s*,\s*((?:"[^"]*"|'[^']+'))\s*\)/g,
        toRaw: "() => void __intrinsic__throwTypeError(`${$2} is not implemented yet. See https://github.com/oven-sh/bun/issues/$1`)"
      }
    ];
    globalsToPrefix = [
      "AbortSignal",
      "Array",
      "ArrayBuffer",
      "Buffer",
      "Infinity",
      "Loader",
      "Promise",
      "ReadableByteStreamController",
      "ReadableStream",
      "ReadableStreamBYOBReader",
      "ReadableStreamBYOBRequest",
      "ReadableStreamDefaultController",
      "ReadableStreamDefaultReader",
      "TransformStream",
      "TransformStreamDefaultController",
      "Uint8Array",
      "String",
      "Buffer",
      "RegExp",
      "WritableStream",
      "WritableStreamDefaultController",
      "WritableStreamDefaultWriter",
      "isFinite",
      "undefined"
    ];
    replacements.push({
      from: new RegExp(`\\bextends\\s+(${globalsToPrefix.join("|")})`, "g"),
      to: "extends __no_intrinsic__%1"
    });
    enums = {
      Loader: LoaderKeys,
      ImportKind: [
        "entry-point-run",
        "entry-point-build",
        "import-statement",
        "require-call",
        "dynamic-import",
        "require-resolve",
        "import-rule",
        "url-token",
        "internal"
      ]
    };
    debug = process.argv[2] === "--debug=ON";
    define = {
      "process.env.NODE_ENV": JSON.stringify(debug ? "development" : "production"),
      "IS_BUN_DEVELOPMENT": String(debug),
      $streamClosed: "1",
      $streamClosing: "2",
      $streamErrored: "3",
      $streamReadable: "4",
      $streamWaiting: "5",
      $streamWritable: "6",
      "process.platform": JSON.stringify(Bun.env.TARGET_PLATFORM ?? process.platform),
      "process.arch": JSON.stringify(Bun.env.TARGET_ARCH ?? process.arch)
    };
    for (const name in enums) {
      const value = enums[name];
      if (typeof value !== "object") throw new Error("Invalid enum object " + name + " defined in " + import.meta.file);
      if (typeof value === null) throw new Error("Invalid enum object " + name + " defined in " + import.meta.file);
      const keys = Array.isArray(value) ? value : Object.keys(value).filter((k) => !k.match(/^[0-9]+$/));
      define[`$${name}IdToLabel`] = "[" + keys.map((k) => `"${k}"`).join(", ") + "]";
      define[`$${name}LabelToId`] = "{" + keys.map((k) => `"${k}": ${keys.indexOf(k) + 1}`).join(", ") + "}";
    }
    for (const name of globalsToPrefix) {
      define[name] = "__intrinsic__" + name;
    }
    for (const key in define) {
      if (key.startsWith("$")) {
        define["__intrinsic__" + key.slice(1)] = define[key];
        delete define[key];
      }
    }
    function_replacements = [
      "$debug",
      "$assert",
      "$zig",
      "$newZigFunction",
      "$cpp",
      "$newCppFunction",
      "$isPromiseFulfilled",
      "$isPromiseRejected",
      "$isPromisePending",
      "$bindgenFn"
    ];
    function_regexp = new RegExp(`__intrinsic__(${function_replacements.join("|").replaceAll("$", "")})`);
  }
});

// src/codegen/builtin-parser.ts
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function createStopRegex(allow_comma) {
  return new RegExp(
    "((?:[(,=;:{]|return|\\=\\>)\\s*)\\/[^\\/\\*]|\\/\\*|\\/\\/|['\"}`\\)" + (allow_comma ? "," : "") + "]|(?<!\\$)\\brequire\\(|(" + function_replacements.map((x) => escapeRegex(x) + "\\(").join("|") + ")"
  );
}
function sliceSourceCode(contents, replace, replaceRequire, endOnComma = false) {
  let bracketCount = 0;
  let i = 0;
  let result = "";
  while (contents.length) {
    const match = contents.match(endOnComma && bracketCount <= 1 ? stop_regex_comma : stop_regex_no_comma);
    i = match?.index ?? contents.length;
    if (match?.[2]) {
      i += match[2].length - 1;
    }
    bracketCount += [...contents.slice(0, i).matchAll(/[({]/g)].length;
    const chunk = replace ? applyReplacements(contents, i) : [contents.slice(0, i), contents.slice(i)];
    result += chunk[0];
    contents = chunk[1];
    if (chunk[2]) {
      continue;
    }
    if (match?.[1]) {
      if (match[1].startsWith("(") || match[1].startsWith(",")) {
        bracketCount++;
      }
      const { result: result2, rest } = sliceRegularExpressionSourceCode(
        contents.slice(match?.[1].length + 1),
        replace
      );
      result += contents.slice(0, match?.[1].length + 1) + result2;
      contents = rest;
      continue;
    }
    if (!contents.length) break;
    if (contents.startsWith("/*")) {
      i = contents.slice(2).indexOf("*/") + 2;
    } else if (contents.startsWith("//")) {
      i = contents.slice(2).indexOf("\n") + 2;
    } else if (contents.startsWith("'")) {
      i = getEndOfBasicString(contents.slice(1), "'") + 2;
    } else if (contents.startsWith('"')) {
      i = getEndOfBasicString(contents.slice(1), '"') + 2;
    } else if (contents.startsWith("`")) {
      const { result: result2, rest } = sliceTemplateLiteralSourceCode(contents.slice(1), replace);
      result += "`" + result2;
      contents = rest;
      i = 0;
      continue;
    } else if (contents.startsWith("}")) {
      bracketCount--;
      if (bracketCount <= 0) {
        result += "}";
        contents = contents.slice(1);
        break;
      }
      i = 1;
    } else if (contents.startsWith(")")) {
      bracketCount--;
      if (bracketCount <= 0) {
        result += ")";
        contents = contents.slice(1);
        break;
      }
      i = 1;
    } else if (endOnComma && contents.startsWith(",")) {
      if (bracketCount <= 1) {
        contents = contents.slice(1);
        let match2 = contents.match(/^\s*\)/);
        if (match2) {
          contents = contents.slice(match2[0].length);
          result += ")";
        } else {
          result += ",";
        }
        break;
      }
      i = 1;
    } else if (contents.startsWith("require(")) {
      if (replaceRequire) {
        const staticSpecifier = contents.match(/\brequire\(["']([^"']+)["']\)/);
        if (staticSpecifier) {
          const specifier = staticSpecifier[1];
          result += replaceRequire(specifier);
          contents = contents.slice(staticSpecifier[0].length);
          continue;
        } else {
          throw new Error("Require with dynamic specifier not supported here.");
        }
      } else {
        throw new Error("Require is not supported here.");
      }
    } else {
      console.error(contents.slice(0, 100));
      throw new Error("TODO");
    }
    result += contents.slice(0, i);
    contents = contents.slice(i);
  }
  return { result, rest: contents };
}
function sliceTemplateLiteralSourceCode(contents, replace) {
  let i = 0;
  let result = "";
  while (contents.length) {
    i = contents.match(/`|\${/).index;
    result += contents.slice(0, i);
    contents = contents.slice(i);
    if (!contents.length) break;
    if (contents.startsWith("`")) {
      result += "`";
      contents = contents.slice(1);
      break;
    } else if (contents.startsWith("$")) {
      const { result: result2, rest } = sliceSourceCode(contents.slice(1), replace);
      result += "$" + result2;
      contents = rest;
      continue;
    } else {
      throw new Error("TODO");
    }
  }
  return { result, rest: contents };
}
function sliceRegularExpressionSourceCode(contents, replace) {
  let i = 0;
  let result = "";
  while (contents.length) {
    i = contents.match(/\/(?!\/|\*)|\\|\[/).index;
    result += contents.slice(0, i);
    contents = contents.slice(i);
    if (!contents.length) break;
    if (contents.startsWith("/")) {
      result += "/";
      contents = contents.slice(1);
      break;
    } else if (contents.startsWith("\\")) {
      result += "\\";
      contents = contents.slice(1);
      if (!contents.length) break;
      result += contents[0];
      contents = contents.slice(1);
      continue;
    } else if (contents.startsWith("[")) {
      let end = contents.match(/(?<!\\)]/).index;
      result += contents.slice(0, end + 1);
      contents = contents.slice(end + 1);
      continue;
    } else {
      throw new Error("TODO");
    }
  }
  return { result, rest: contents };
}
function getEndOfBasicString(str, quote) {
  let i = 0;
  while (i < str.length) {
    if (str[i] === "\\") {
      i++;
    } else if (str[i] === quote) {
      return i;
    }
    i++;
  }
  throw new Error("String did not end");
}
var stop_regex_comma, stop_regex_no_comma;
var init_builtin_parser = __esm({
  "src/codegen/builtin-parser.ts"() {
    "use strict";
    init_replacements();
    stop_regex_comma = createStopRegex(true);
    stop_regex_no_comma = createStopRegex(false);
  }
});

// src/codegen/client-js.ts
function createLogClientJS(filepath, publicName) {
  return `
let $debug_trace = Bun.env.TRACE && Bun.env.TRACE === '1';
let $debug_log_enabled = ((env) => (
  // The rationale for checking all these variables is just so you don't have to exactly remember which one you set.
  (env.BUN_DEBUG_ALL && env.BUN_DEBUG_ALL !== '0')
  || (env.BUN_DEBUG_JS && env.BUN_DEBUG_JS !== '0')
  || (env.BUN_DEBUG_${pathToUpperSnakeCase(publicName)} === '1')
  || (env.DEBUG_${pathToUpperSnakeCase(filepath)} === '1')
))(Bun.env);
let $debug_pid_prefix = Bun.env.SHOW_PID === '1';
let $debug_log = $debug_log_enabled ? (...args) => {
  // warn goes to stderr without colorizing
  console[$debug_trace ? 'trace' : 'warn'](($debug_pid_prefix ? \`[\${process.pid}] \` : '') + (Bun.enableANSIColors ? '\\x1b[90m[${publicName}]\\x1b[0m' : '[${publicName}]'), ...args);
} : () => {};
`;
}
function createAssertClientJS(publicName) {
  return `
let $assert = function(check, sourceString, ...message) {
  if (!check) {
    const prevPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = (e, stack) => {
      return e.name + ': ' + e.message + '\\n' + stack.slice(1).map(x => '  at ' + x.toString()).join('\\n');
    };
    const e = new Error(sourceString);
    e.stack; // materialize stack
    e.name = 'AssertionError';
    Error.prepareStackTrace = prevPrepareStackTrace;
    console.error('[${publicName}] ASSERTION FAILED: ' + sourceString);
    if (message.length) console.warn(...message);
    console.warn(e.stack.split('\\n')[1] + '\\n');
    if (Bun.env.ASSERT === 'CRASH') process.exit(0xAA);
    throw e;
  }
}
`;
}
var init_client_js = __esm({
  "src/codegen/client-js.ts"() {
    "use strict";
    init_helpers();
  }
});

// src/codegen/bundle-functions.ts
var bundle_functions_exports = {};
__export(bundle_functions_exports, {
  bundleBuiltinFunctions: () => bundleBuiltinFunctions
});
import fs3 from "node:fs";
import assert from "assert";
import { readdirSync, rmSync } from "fs";
import path4 from "path";
async function processFileSplit(filename) {
  const basename2 = path4.basename(filename, ".ts");
  let contents = fs3.readFileSync(filename, "utf-8");
  contents = applyGlobalReplacements(contents);
  const originalContents = contents;
  const consumeWhitespace = /^\s*/;
  const consumeTopLevelContent = /^(\/\*|\/\/|type|import|interface|\$|const enum|export (?:async )?function|(?:async )?function)/;
  const consumeEndOfType = /;|.(?=export|type|interface|\$|\/\/|\/\*|function|const enum)/;
  const functions = [];
  let directives = {};
  const bundledFunctions = [];
  let internal = false;
  const topLevelEnums = [];
  while (contents.length) {
    contents = contents.replace(consumeWhitespace, "");
    if (!contents.length) break;
    const match = contents.match(consumeTopLevelContent);
    if (!match) {
      const pos = originalContents.length - contents.length;
      let lineNumber = 1;
      let columnNumber = 1;
      let lineStartPos = 0;
      for (let i = 0; i < pos; i++) {
        if (originalContents[i] === "\n") {
          lineNumber++;
          columnNumber = 1;
          lineStartPos = i + 1;
        } else {
          columnNumber++;
        }
        if (i === pos) {
          break;
        }
      }
      const lineEndPos = lineStartPos + originalContents.slice(lineStartPos).indexOf("\n");
      throw new SyntaxError(
        "Could not process input:\n" + originalContents.slice(lineStartPos, lineEndPos) + "\n" + " ".repeat(pos - lineStartPos) + "^\n    at " + filename + ":" + lineNumber + ":" + columnNumber
      );
    }
    contents = contents.slice(match.index);
    if (match[1] === "import") {
      const i = contents.indexOf(";");
      contents = contents.slice(i + 1);
    } else if (match[1] === "/*") {
      const i = contents.indexOf("*/") + 2;
      internal ||= contents.slice(0, i).includes("@internal");
      contents = contents.slice(i);
    } else if (match[1] === "//") {
      const i = contents.indexOf("\n") + 1;
      internal ||= contents.slice(0, i).includes("@internal");
      contents = contents.slice(i);
    } else if (match[1] === "type" || match[1] === "export type") {
      const i = contents.search(consumeEndOfType);
      contents = contents.slice(i + 1);
    } else if (match[1] === "interface") {
      contents = sliceSourceCode(contents, false).rest;
    } else if (match[1] === "const enum") {
      const { result, rest } = sliceSourceCode(contents, false);
      const i = result.indexOf("{\n");
      topLevelEnums.push({
        name: result.slice("const enum ".length, i).trim(),
        code: "\n" + result
      });
      contents = rest;
    } else if (match[1] === "$") {
      const directive = contents.match(/^\$([a-zA-Z0-9]+)(?:\s*=\s*([^\r\n]+?))?\s*;?\r?\n/);
      if (!directive) {
        throw new SyntaxError("Could not parse directive:\n" + contents.slice(0, contents.indexOf("\n")));
      }
      const name = directive[1];
      let value;
      try {
        value = directive[2] ? JSON.parse(directive[2]) : true;
      } catch (error) {
        throw new SyntaxError("Could not parse directive value " + directive[2] + " (must be JSON parsable)");
      }
      if (name === "constructor") {
        directives.ConstructAbility = "CanConstruct";
      } else if (name === "nakedConstructor") {
        directives.ConstructAbility = "CanConstruct";
        directives.ConstructKind = "Naked";
      } else {
        directives[name] = value;
      }
      contents = contents.slice(directive[0].length);
    } else if (match[1] === "export function" || match[1] === "export async function") {
      const nameMatch = contents.match(/^export\s+(async\s+)?function\s([_a-zA-Z0-9]+)\s*/);
      if (!nameMatch)
        throw new SyntaxError("Could not parse function name:\n" + contents.slice(0, contents.indexOf("\n")));
      const async = Boolean(nameMatch[1]);
      const name = nameMatch[2];
      var remaining = contents.slice(nameMatch[0].length);
      if (remaining.startsWith("<")) {
        var cursor = 1;
        var depth = 1;
        for (; depth > 0 && cursor < remaining.length; cursor++) {
          switch (remaining[cursor]) {
            case "<":
              depth++;
              break;
            case ">":
              depth--;
              break;
          }
        }
        if (depth > 0) {
          throw new SyntaxError(
            `Function ${name} has an unclosed generic type. Missing ${depth} closing angle bracket(s).`
          );
        }
        remaining = remaining.slice(cursor).trimStart();
      }
      assert(
        remaining.startsWith("("),
        new SyntaxError(`Function ${name} is missing parameter list start. Found:

	${remaining.slice(0, 100)}`)
      );
      const paramMatch = remaining.match(/^\(([^)]*)\)(?:\s*:\s*([^{\n]+))?\s*{?/);
      if (!paramMatch)
        throw new SyntaxError(
          `Could not parse parameters for function ${name}:
` + contents.slice(0, contents.indexOf("\n"))
        );
      const paramString = paramMatch[1];
      const params = paramString.trim().length === 0 ? [] : paramString.split(",").map((x) => x.replace(/:.+$/, "").trim());
      if (params[0] === "this") {
        params.shift();
      }
      const { result, rest } = sliceSourceCode(
        remaining.slice(paramMatch[0].length - 1),
        true,
        (x) => globalThis.requireTransformer(x, SRC_DIR + "/" + basename2)
      );
      const source = result.trim().slice(2, -1);
      const constEnumsUsedInFunction = [];
      if (topLevelEnums.length) {
        for (const { name: name2, code } of topLevelEnums) {
          if (source.includes(name2)) {
            constEnumsUsedInFunction.push(code);
          }
        }
      }
      functions.push({
        name,
        params,
        directives,
        source,
        async,
        enums: constEnumsUsedInFunction
      });
      contents = rest;
      directives = {};
    } else if (match[1] === "function" || match[1] === "async function") {
      const fnname = contents.match(/^function ([a-zA-Z0-9]+)\(([^)]*)\)(?:\s*:\s*([^{\n]+))?\s*{?/)[1];
      throw new SyntaxError("All top level functions must be exported: " + fnname);
    } else {
      throw new Error("TODO: parse " + match[1]);
    }
  }
  for (const fn of functions) {
    const tmpFile = path4.join(TMP_DIR, `${basename2}.${fn.name}.ts`);
    const useThis = true;
    await Bun.write(
      tmpFile,
      `// @ts-nocheck
// GENERATED TEMP FILE - DO NOT EDIT
// Sourced from ${path4.relative(TMP_DIR, filename)}
${fn.enums.join("\n")}
// do not allow the bundler to rename a symbol to $
($);

$$capture_start$$(${fn.async ? "async " : ""}${useThis ? `function(${fn.params.join(",")})` : `${fn.params.length === 1 ? fn.params[0] : `(${fn.params.join(",")})`}=>`} {${fn.source}}).$$capture_end$$;
`
    );
    await Bun.sleep(1);
    const build = await Bun.build({
      entrypoints: [tmpFile],
      define,
      target: "bun",
      minify: { syntax: true, whitespace: false, keepNames: true }
    });
    if (!build.success) {
      throw new AggregateError(build.logs, "Failed bundling builtin function " + fn.name + " from " + basename2 + ".ts");
    }
    if (build.outputs.length !== 1) {
      throw new Error("expected one output");
    }
    let output = (await build.outputs[0].text()).replaceAll("// @bun\n", "");
    let usesDebug = output.includes("$debug_log");
    let usesAssert = output.includes("$assert");
    const captured = output.match(/\$\$capture_start\$\$([\s\S]+)\.\$\$capture_end\$\$/)[1];
    const finalReplacement = (fn.directives.sloppy ? captured : captured.replace(
      /function\s*\(.*?\)\s*{/,
      '$&"use strict";' + (usesDebug ? createLogClientJS("BUILTINS", fn.name) : "") + (usesAssert ? createAssertClientJS(fn.name) : "")
    )).replace(/^\((async )?function\(/, "($1function (").replace(/__intrinsic__/g, "@").replace(/__no_intrinsic__/g, "") + "\n";
    const errors2 = [...finalReplacement.matchAll(/@bundleError\((.*)\)/g)];
    if (errors2.length) {
      throw new Error(`Errors in ${basename2}.ts:
${errors2.map((x) => x[1]).join("\n")}`);
    }
    bundledFunctions.push({
      name: fn.name,
      directives: fn.directives,
      source: finalReplacement,
      params: fn.params,
      // Async functions automatically get Private visibility because the parser
      // upgrades them when they use await (see Parser.cpp parseFunctionBody)
      visibility: fn.directives.visibility ?? (fn.directives.linkTimeConstant || fn.async ? "Private" : "Public"),
      isGetter: !!fn.directives.getter,
      constructAbility: fn.directives.ConstructAbility ?? "CannotConstruct",
      constructKind: fn.directives.ConstructKind ?? "None",
      isLinkTimeConstant: !!fn.directives.linkTimeConstant,
      intrinsic: fn.directives.intrinsic ?? "NoIntrinsic",
      // Not known yet.
      sourceOffset: 0,
      overriddenName: fn.directives.getter ? `"get ${fn.name}"_s` : fn.directives.overriddenName ? `"${fn.directives.overriddenName}"_s` : "ASCIILiteral()"
    });
  }
  return {
    functions: bundledFunctions.sort((a, b) => a.name.localeCompare(b.name)),
    internal
  };
}
async function processFunctionFile(x) {
  const basename2 = path4.basename(x, ".ts");
  try {
    files.push({
      basename: basename2,
      ...await processFileSplit(path4.join(SRC_DIR, x))
    });
  } catch (error) {
    console.error("Failed to process file: " + basename2 + ".ts");
    console.error(error);
    process.exit(1);
  }
}
async function bundleBuiltinFunctions({ requireTransformer: requireTransformer2 }) {
  const filesToProcess = readdirSync(SRC_DIR).filter((x) => x.endsWith(".ts") && !x.endsWith(".d.ts")).sort();
  if (PARALLEL) {
    await Promise.all(filesToProcess.map(processFunctionFile));
  } else {
    for (const x of filesToProcess) {
      await processFunctionFile(x);
    }
  }
  let combinedSourceCodeChars = "";
  let combinedSourceCodeLength = 0;
  {
    for (const { basename: basename2, functions } of files) {
      for (const fn of functions) {
        fn.sourceOffset = combinedSourceCodeLength;
        combinedSourceCodeLength += fn.source.length;
        if (combinedSourceCodeChars && !combinedSourceCodeChars.endsWith(",")) {
          combinedSourceCodeChars += ",";
        }
        combinedSourceCodeChars += addCPPCharArray(fn.source, false);
      }
    }
  }
  let additionalPrivateNames = /* @__PURE__ */ new Set();
  function privateName(name) {
    additionalPrivateNames.add(name);
    return "builtinNames." + name + "PrivateName()";
  }
  let bundledCPP = `// Generated by ${import.meta.path}
    namespace Zig { class GlobalObject; }
    #include "root.h"
    #include "config.h"
    #include "JSDOMGlobalObject.h"
    #include "WebCoreJSClientData.h"
    #include "WebCoreJSBuiltins.h"
    #include <JavaScriptCore/JSObjectInlines.h>
    #include "BunBuiltinNames.h"

    namespace WebCore {
        static const Latin1Character combinedSourceCodeBuffer[${combinedSourceCodeLength + 1}] = { ${combinedSourceCodeChars}, 0 };
        static const std::span<const Latin1Character> internalCombinedSource = { combinedSourceCodeBuffer, ${combinedSourceCodeLength} };
    `;
  for (const { basename: basename2, functions } of files) {
    bundledCPP += `
#pragma mark ${basename2}
`;
    const lowerBasename = low(basename2);
    for (const fn of functions) {
      const name = `${basename2}${cap(fn.name)}`;
      bundledCPP += `
JSC::FunctionExecutable* ${lowerBasename}${cap(fn.name)}CodeGenerator(JSC::VM& vm)
{
    auto &builtins = static_cast<JSVMClientData*>(vm.clientData)->builtinFunctions().${lowerBasename}Builtins();
    auto *executable = builtins.${lowerBasename}${cap(fn.name)}CodeExecutable();
    return executable->link(vm, nullptr, builtins.${lowerBasename}${cap(fn.name)}CodeSource(), std::nullopt, JSC::NoIntrinsic);
}
`;
    }
  }
  const initializeSourceCodeFn = (fn, basename2) => {
    const name = `${low(basename2)}${cap(fn.name)}CodeSource`;
    return `m_${name}(SourceCode(sourceProvider.copyRef(), ${fn.sourceOffset}, ${fn.source.length + fn.sourceOffset}, 1, 1))`;
  };
  for (const { basename: basename2, internal, functions } of files) {
    bundledCPP += `
#pragma mark ${basename2}

${basename2}BuiltinsWrapper::${basename2}BuiltinsWrapper(JSC::VM& vm, RefPtr<JSC::SourceProvider> sourceProvider, BunBuiltinNames &builtinNames)
    : m_vm(vm)`;
    if (internal) {
      bundledCPP += `, ${functions.map((fn) => `m_${fn.name}PrivateName(${privateName(fn.name)})`).join(",\n   ")}`;
    }
    bundledCPP += `, ${functions.map((fn) => initializeSourceCodeFn(fn, basename2)).join(",\n   ")} {}
`;
  }
  bundledCPP += `
RefPtr<JSC::SourceProvider> createBuiltinsSourceProvider() {
    return JSC::StringSourceProvider::create(StringImpl::createWithoutCopying(internalCombinedSource), SourceOrigin(), String(), SourceTaintedOrigin());
}
`;
  bundledCPP += `
JSBuiltinFunctions::JSBuiltinFunctions(JSC::VM& vm, RefPtr<JSC::SourceProvider> provider, BunBuiltinNames& builtinNames) : m_vm(vm),
  ${files.map(({ basename: basename2 }) => `m_${low(basename2)}Builtins(vm, provider, builtinNames)`).join(", ")}
{}

void JSBuiltinFunctions::exportNames() {
`;
  for (const { basename: basename2, internal } of files) {
    if (internal) {
      bundledCPP += `     m_${low(basename2)}Builtins.exportNames();
`;
    }
  }
  bundledCPP += `
}

`;
  bundledCPP += `

JSBuiltinInternalFunctions::JSBuiltinInternalFunctions(JSC::VM& vm) : m_vm(vm)
    `;
  for (const { basename: basename2, internal } of files) {
    if (internal) {
      bundledCPP += `    , m_${low(basename2)}(vm)
`;
    }
  }
  bundledCPP += `{
      UNUSED_PARAM(vm);
  }

    template<typename Visitor>
    void JSBuiltinInternalFunctions::visit(Visitor& visitor)
    {
    `;
  for (const { basename: basename2, internal } of files) {
    if (internal) bundledCPP += `    m_${low(basename2)}.visit(visitor);
`;
  }
  bundledCPP += `
        UNUSED_PARAM(visitor);
    }

    template void JSBuiltinInternalFunctions::visit(AbstractSlotVisitor&);
    template void JSBuiltinInternalFunctions::visit(SlotVisitor&);
    `;
  for (const { basename: basename2, internal } of files) {
    if (internal) {
      bundledCPP += `    template void ${basename2}BuiltinFunctions::visit(JSC::AbstractSlotVisitor&);
    template void ${basename2}BuiltinFunctions::visit(JSC::SlotVisitor&);
`;
    }
  }
  bundledCPP += `
    SUPPRESS_ASAN void JSBuiltinInternalFunctions::initialize(Zig::GlobalObject& globalObject)
    {
        UNUSED_PARAM(globalObject);
    `;
  for (const { basename: basename2, internal } of files) {
    if (internal) {
      bundledCPP += `    m_${low(basename2)}.init(globalObject);
`;
    }
  }
  bundledCPP += `
        JSVMClientData& clientData = *static_cast<JSVMClientData*>(m_vm.clientData);
        Zig::GlobalObject::GlobalPropertyInfo staticGlobals[] = {
    `;
  for (const { basename: basename2, internal } of files) {
    if (internal) {
      bundledCPP += `#define DECLARE_GLOBAL_STATIC(name) \\
        Zig::GlobalObject::GlobalPropertyInfo( \\
            clientData.builtinFunctions().${low(basename2)}Builtins().name##PrivateName(), ${low(basename2)}().m_##name##Function.get() , JSC::PropertyAttribute::DontDelete | JSC::PropertyAttribute::ReadOnly),
        WEBCORE_FOREACH_${basename2.toUpperCase()}_BUILTIN_FUNCTION_NAME(DECLARE_GLOBAL_STATIC)
      #undef DECLARE_GLOBAL_STATIC
      `;
    }
  }
  bundledCPP += `
        };
        globalObject.addStaticGlobals(staticGlobals);
        UNUSED_PARAM(clientData);
    }

    } // namespace WebCore
    `;
  let bundledHeader = `// Generated by ${import.meta.path}
    // Do not edit by hand.
    #pragma once
    namespace Zig { class GlobalObject; }
    #include "root.h"
    #include <JavaScriptCore/BuiltinUtils.h>
    #include <JavaScriptCore/Identifier.h>
    #include <JavaScriptCore/JSFunction.h>
    #include <JavaScriptCore/UnlinkedFunctionExecutable.h>
    #include <JavaScriptCore/VM.h>
    #include <JavaScriptCore/WeakInlines.h>

    namespace JSC {
    class FunctionExecutable;
    }

    namespace WebCore {
    `;
  for (const { basename: basename2, functions, internal } of files) {
    bundledHeader += `/* ${basename2}.ts */
    `;
    const lowerBasename = low(basename2);
    for (const fn of functions) {
      const name = `${lowerBasename}${cap(fn.name)}Code`;
      bundledHeader += `// ${fn.name}
    #define WEBCORE_BUILTIN_${basename2.toUpperCase()}_${fn.name.toUpperCase()} 1
    static constexpr JSC::ConstructAbility s_${name}ConstructAbility = JSC::ConstructAbility::${fn.constructAbility};
    static constexpr JSC::InlineAttribute s_${name}InlineAttribute = JSC::InlineAttribute::${fn.directives.alwaysInline ? "Always" : "None"};
    static constexpr JSC::ConstructorKind s_${name}ConstructorKind = JSC::ConstructorKind::${fn.constructKind};
    static constexpr JSC::ImplementationVisibility s_${name}ImplementationVisibility = JSC::ImplementationVisibility::${fn.visibility};

    `;
    }
    bundledHeader += `#define WEBCORE_FOREACH_${basename2.toUpperCase()}_BUILTIN_DATA(macro) \\
`;
    for (const fn of functions) {
      bundledHeader += `    macro(${fn.name}, ${lowerBasename}${cap(fn.name)}, ${fn.params.length}) \\
`;
    }
    bundledHeader += "\n";
    bundledHeader += `#define WEBCORE_FOREACH_${basename2.toUpperCase()}_BUILTIN_CODE(macro) \\
`;
    for (const fn of functions) {
      const name = `${lowerBasename}${cap(fn.name)}Code`;
      bundledHeader += `    macro(${name}, ${fn.name}, ${fn.overriddenName}, s_${name}Length) \\
`;
    }
    bundledHeader += "\n";
    bundledHeader += `#define WEBCORE_FOREACH_${basename2.toUpperCase()}_BUILTIN_FUNCTION_NAME(macro) \\
`;
    for (const fn of functions) {
      bundledHeader += `    macro(${fn.name}) \\
`;
    }
    bundledHeader += `
    #define DECLARE_BUILTIN_GENERATOR(codeName, functionName, overriddenName, argumentCount) \\
        JSC::FunctionExecutable* codeName##Generator(JSC::VM&);

    WEBCORE_FOREACH_${basename2.toUpperCase()}_BUILTIN_CODE(DECLARE_BUILTIN_GENERATOR)
    #undef DECLARE_BUILTIN_GENERATOR

    class ${basename2}BuiltinsWrapper : private JSC::WeakHandleOwner {
    public:
        explicit ${basename2}BuiltinsWrapper(JSC::VM& vm, RefPtr<JSC::SourceProvider> sourceProvider, BunBuiltinNames &builtinNames);

    #define EXPOSE_BUILTIN_EXECUTABLES(name, functionName, overriddenName, length) \\
        JSC::UnlinkedFunctionExecutable* name##Executable(); \\
        const JSC::SourceCode& name##Source() const { return m_##name##Source; }
        WEBCORE_FOREACH_${basename2.toUpperCase()}_BUILTIN_CODE(EXPOSE_BUILTIN_EXECUTABLES)
    #undef EXPOSE_BUILTIN_EXECUTABLES

        WEBCORE_FOREACH_${basename2.toUpperCase()}_BUILTIN_FUNCTION_NAME(DECLARE_BUILTIN_IDENTIFIER_ACCESSOR)

        void exportNames();

    private:
        [[maybe_unused]] JSC::VM& m_vm;

        WEBCORE_FOREACH_${basename2.toUpperCase()}_BUILTIN_FUNCTION_NAME(DECLARE_BUILTIN_NAMES)

    #define DECLARE_BUILTIN_SOURCE_MEMBERS(name, functionName, overriddenName, length) \\
        JSC::SourceCode m_##name##Source;\\
        JSC::Weak<JSC::UnlinkedFunctionExecutable> m_##name##Executable;
        WEBCORE_FOREACH_${basename2.toUpperCase()}_BUILTIN_CODE(DECLARE_BUILTIN_SOURCE_MEMBERS)
    #undef DECLARE_BUILTIN_SOURCE_MEMBERS

    };

    #define DEFINE_BUILTIN_EXECUTABLES(name, functionName, overriddenName, length) \\
    inline JSC::UnlinkedFunctionExecutable* ${basename2}BuiltinsWrapper::name##Executable() \\
    {\\
        if (!m_##name##Executable) {\\
            JSC::Identifier executableName = functionName##PublicName();\\
            if (overriddenName)\\
                executableName = JSC::Identifier::fromString(m_vm, overriddenName);\\
            m_##name##Executable = JSC::Weak<JSC::UnlinkedFunctionExecutable>(JSC::createBuiltinExecutable(m_vm, m_##name##Source, executableName, s_##name##ImplementationVisibility, s_##name##ConstructorKind, s_##name##ConstructAbility, s_##name##InlineAttribute), this, &m_##name##Executable);\\
        }\\
        return m_##name##Executable.get();\\
    }
    WEBCORE_FOREACH_${basename2.toUpperCase()}_BUILTIN_CODE(DEFINE_BUILTIN_EXECUTABLES)
    #undef DEFINE_BUILTIN_EXECUTABLES

    inline void ${basename2}BuiltinsWrapper::exportNames()
    {
    #define EXPORT_FUNCTION_NAME(name) m_vm.propertyNames->appendExternalName(name##PublicName(), name##PrivateName());
        WEBCORE_FOREACH_${basename2.toUpperCase()}_BUILTIN_FUNCTION_NAME(EXPORT_FUNCTION_NAME)
    #undef EXPORT_FUNCTION_NAME
    }
    `;
    if (internal) {
      bundledHeader += `class ${basename2}BuiltinFunctions {
    public:
        explicit ${basename2}BuiltinFunctions(JSC::VM& vm) : m_vm(vm) { }

        void init(JSC::JSGlobalObject&);
        template<typename Visitor> void visit(Visitor&);

    public:
        [[maybe_unused]] JSC::VM& m_vm;

    #define DECLARE_BUILTIN_SOURCE_MEMBERS(functionName) \\
        JSC::WriteBarrier<JSC::JSFunction> m_##functionName##Function;
        WEBCORE_FOREACH_${basename2.toUpperCase()}_BUILTIN_FUNCTION_NAME(DECLARE_BUILTIN_SOURCE_MEMBERS)
    #undef DECLARE_BUILTIN_SOURCE_MEMBERS
    };

    inline void ${basename2}BuiltinFunctions::init(JSC::JSGlobalObject& globalObject)
    {
    #define EXPORT_FUNCTION(codeName, functionName, overriddenName, length) \\
        m_##functionName##Function.set(m_vm, &globalObject, JSC::JSFunction::create(m_vm, &globalObject, codeName##Generator(m_vm), &globalObject));
        WEBCORE_FOREACH_${basename2.toUpperCase()}_BUILTIN_CODE(EXPORT_FUNCTION)
    #undef EXPORT_FUNCTION
    }

    template<typename Visitor>
    inline void ${basename2}BuiltinFunctions::visit(Visitor& visitor)
    {
    #define VISIT_FUNCTION(name) visitor.append(m_##name##Function);
        WEBCORE_FOREACH_${basename2.toUpperCase()}_BUILTIN_FUNCTION_NAME(VISIT_FUNCTION)
    #undef VISIT_FUNCTION
    }

    extern template void ${basename2}BuiltinFunctions::visit(JSC::AbstractSlotVisitor&);
    extern template void ${basename2}BuiltinFunctions::visit(JSC::SlotVisitor&);
        `;
    }
  }
  bundledHeader += `class JSBuiltinFunctions {
        WTF_DEPRECATED_MAKE_FAST_ALLOCATED(JSBuiltinFunctions);
    public:
        explicit JSBuiltinFunctions(JSC::VM& vm, RefPtr<JSC::SourceProvider> provider, BunBuiltinNames &builtinNames);
        void exportNames();

    `;
  for (const { basename: basename2 } of files) {
    bundledHeader += `    ${basename2}BuiltinsWrapper& ${low(basename2)}Builtins() { return m_${low(
      basename2
    )}Builtins; }
`;
  }
  bundledHeader += `
    private:
        [[maybe_unused]] JSC::VM& m_vm;
    `;
  for (const { basename: basename2 } of files) {
    bundledHeader += `    ${basename2}BuiltinsWrapper m_${low(basename2)}Builtins;
`;
  }
  bundledHeader += `;
    };

    class JSBuiltinInternalFunctions {
        WTF_DEPRECATED_MAKE_FAST_ALLOCATED(JSBuiltinInternalFunctions);
    public:
        explicit JSBuiltinInternalFunctions(JSC::VM&);

        template<typename Visitor> void visit(Visitor&);
        void initialize(Zig::GlobalObject&);
    `;
  for (const { basename: basename2, internal } of files) {
    if (internal) {
      bundledHeader += `    ${basename2}BuiltinFunctions& ${low(basename2)}() { return m_${low(basename2)}; }
`;
    }
  }
  bundledHeader += `
    private:
        [[maybe_unused]] JSC::VM& m_vm;
    `;
  for (const { basename: basename2, internal } of files) {
    if (internal) {
      bundledHeader += `    ${basename2}BuiltinFunctions m_${low(basename2)};
`;
    }
  }
  bundledHeader += `
    };

    } // namespace WebCore
    `;
  {
    const BunBuiltinNamesHeader = __require("fs").readFileSync(
      path4.join("/Volumes/Data/src/bun/src/codegen", "../js/builtins/BunBuiltinNames.h"),
      "utf8"
    );
    let definedBuiltinNamesStartI = BunBuiltinNamesHeader.indexOf(
      "#define BUN_COMMON_PRIVATE_IDENTIFIERS_EACH_PROPERTY_NAME"
    );
    let definedBuiltinNamesMacroEndI = BunBuiltinNamesHeader.indexOf(
      "--- END of BUN_COMMON_PRIVATE_IDENTIFIERS_EACH_PROPERTY_NAME ---"
    );
    const definedBuiltinNames = BunBuiltinNamesHeader.slice(definedBuiltinNamesStartI, definedBuiltinNamesMacroEndI).split("\n").map((x) => x.trim()).filter((x) => x.startsWith("macro(")).map((x) => x.slice(x.indexOf("(") + 1, x.indexOf(")"))).map((x) => x.trim()).sort();
    const uniqueDefinedBuiltinNames = /* @__PURE__ */ new Set();
    for (let name of definedBuiltinNames) {
      const prevSize = uniqueDefinedBuiltinNames.size;
      uniqueDefinedBuiltinNames.add(name);
      if (uniqueDefinedBuiltinNames.size === prevSize) {
        throw new Error(`Duplicate private name "${name}" in BunBuiltinNames.h`);
      }
    }
    for (let additionalPrivateName of additionalPrivateNames) {
      if (uniqueDefinedBuiltinNames.has(additionalPrivateName)) {
        additionalPrivateNames.delete(additionalPrivateName);
      }
    }
    let additionalPrivateNamesHeader = `// Generated by ${import.meta.path}
#pragma once

#ifndef BUN_ADDITIONAL_BUILTIN_NAMES
#define BUN_ADDITIONAL_BUILTIN_NAMES(macro) \\
  ${Array.from(additionalPrivateNames).map((x) => `macro(${x})`).join(" \\\n  ")}
#endif
`;
    writeIfNotChanged(path4.join(CODEGEN_DIR, "BunBuiltinNames+extras.h"), additionalPrivateNamesHeader);
  }
  writeIfNotChanged(path4.join(CODEGEN_DIR, "WebCoreJSBuiltins.h"), bundledHeader);
  writeIfNotChanged(path4.join(CODEGEN_DIR, "WebCoreJSBuiltins.cpp"), bundledCPP);
  let dts = `// Generated by \`bun src/js/builtins/codegen\`
    // Do not edit by hand.
    type RemoveThis<F> = F extends (this: infer T, ...args: infer A) => infer R ? (...args: A) => R : F;
    `;
  for (const { basename: basename2, functions, internal } of files) {
    if (internal) {
      dts += `
// ${basename2}.ts
`;
      for (const fn of functions) {
        dts += `declare const $${fn.name}: RemoveThis<typeof import("${path4.relative(
          CODEGEN_DIR,
          path4.join(SRC_DIR, basename2)
        )}")[${JSON.stringify(fn.name)}]>;
`;
      }
    }
  }
  dts += getJS2NativeDTS();
  writeIfNotChanged(path4.join(CODEGEN_DIR, "WebCoreJSBuiltins.d.ts"), dts);
  const totalJSSize = files.reduce(
    (acc, { functions }) => acc + functions.reduce((acc2, fn) => acc2 + fn.source.length, 0),
    0
  );
  if (!KEEP_TMP) {
    await rmSync(TMP_DIR, { recursive: true });
  }
  globalThis.internalFunctionJSSize = totalJSSize;
  globalThis.internalFunctionCount = files.reduce((acc, { functions }) => acc + functions.length, 0);
  globalThis.internalFunctionFileCount = files.length;
}
var PARALLEL, KEEP_TMP, CMAKE_BUILD_ROOT, SRC_DIR, CODEGEN_DIR, TMP_DIR, files;
var init_bundle_functions = __esm({
  "src/codegen/bundle-functions.ts"() {
    "use strict";
    init_builtin_parser();
    init_client_js();
    init_generate_js2native();
    init_helpers();
    init_replacements();
    PARALLEL = false;
    KEEP_TMP = true;
    if (false) {
    }
    CMAKE_BUILD_ROOT = globalThis.CMAKE_BUILD_ROOT;
    if (!CMAKE_BUILD_ROOT) {
      throw new Error("CMAKE_BUILD_ROOT is not defined");
    }
    SRC_DIR = path4.join("/Volumes/Data/src/bun/src/codegen", "../js/builtins");
    CODEGEN_DIR = path4.join(CMAKE_BUILD_ROOT, "./codegen");
    TMP_DIR = path4.join(CMAKE_BUILD_ROOT, "./tmp_functions");
    files = [];
  }
});

// src/codegen/bundle-modules.ts
init_js_classes();
init_builtin_parser();
init_client_js();
init_generate_js2native();
init_helpers();
import fs4 from "node:fs";
import { mkdir, writeFile } from "fs/promises";
import { builtinModules } from "node:module";
import path5 from "path";

// src/codegen/internal-module-registry-scanner.ts
init_helpers();
import fs2 from "node:fs";
import path3 from "path";
function createInternalModuleRegistry(basedir) {
  const moduleList2 = ["bun", "node", "thirdparty", "internal"].flatMap((dir) => readdirRecursive(path3.join(basedir, dir))).filter((file) => file.endsWith(".js") || file.endsWith(".ts") && !file.endsWith(".d.ts")).map((file) => file.slice(basedir.length + 1)).map((x) => x.replaceAll("\\", "/")).sort();
  const internalRegistry = /* @__PURE__ */ new Map();
  for (let i = 0; i < moduleList2.length; i++) {
    const prefix = moduleList2[i].startsWith("node/") ? "node:" : moduleList2[i].startsWith("bun:") ? "bun:" : moduleList2[i].startsWith("internal/") ? "internal/" : void 0;
    if (prefix) {
      const id = prefix + moduleList2[i].slice(prefix.length).replaceAll(".", "/").slice(0, -3);
      internalRegistry.set(id, i);
    }
  }
  moduleList2.push("internal-for-testing.ts");
  internalRegistry.set("bun:internal-for-testing", moduleList2.length - 1);
  let nextNativeModuleId = 0;
  const nativeModuleIds2 = {};
  const nativeModuleEnums2 = {};
  const nativeModuleEnumToId2 = {};
  const nativeModuleH = fs2.readFileSync(path3.join(basedir, "../jsc/modules/_NativeModule.h"), "utf8");
  for (const [_, idString, enumValue] of nativeModuleH.matchAll(/macro\((.*?),(.*?)\)/g)) {
    const processedIdString = JSON.parse(idString.trim().replace(/_s$/, ""));
    const processedEnumValue = enumValue.trim();
    const processedNumericId = nextNativeModuleId++;
    nativeModuleIds2[processedIdString] = processedNumericId;
    nativeModuleEnums2[processedIdString] = processedEnumValue;
    nativeModuleEnumToId2[processedEnumValue] = processedNumericId;
  }
  const nativeStartIndex2 = moduleList2.length;
  for (const [id] of Object.entries(nativeModuleIds2)) {
    moduleList2.push(id);
    internalRegistry.set(id, moduleList2.length - 1);
  }
  if (nextNativeModuleId === 0) {
    throw new Error(
      "Could not find BUN_FOREACH_ESM_AND_CJS_NATIVE_MODULE in _NativeModule.h. Knowing native module IDs is a part of the codegen process."
    );
  }
  function codegenRequireId(id) {
    return `(__intrinsic__getInternalField(__intrinsic__internalModuleRegistry, ${id}) || __intrinsic__createInternalModuleById(${id}))`;
  }
  const requireTransformer2 = (specifier, from) => {
    const directMatch = internalRegistry.get(specifier);
    if (directMatch) return codegenRequireId(`${directMatch}/*${specifier}*/`);
    const relativeMatch = resolveSyncOrNull(specifier, path3.join(basedir, path3.dirname(from))) ?? resolveSyncOrNull(specifier, basedir);
    const suffix = 'Only files in "src/js" besides "src/js/builtins" can be imported here. Note that the "node:" or "bun:" prefix is required here.';
    if (relativeMatch) {
      const found = moduleList2.indexOf(path3.relative(basedir, relativeMatch).replaceAll("\\", "/"));
      if (found === -1) {
        throw new Error(
          `Builtin Bundler: "${specifier}" cannot be imported from "${from}" because it doesn't get a module ID. ${suffix}`
        );
      }
      return codegenRequireId(`${found}/*${path3.relative(basedir, relativeMatch)}*/`);
    }
    throw new Error(`Builtin Bundler: Could not resolve "${specifier}" in "${from}". ${suffix}`);
  };
  return {
    requireTransformer: requireTransformer2,
    nativeModuleIds: nativeModuleIds2,
    nativeModuleEnums: nativeModuleEnums2,
    nativeModuleEnumToId: nativeModuleEnumToId2,
    internalRegistry,
    moduleList: moduleList2,
    nativeStartIndex: nativeStartIndex2
  };
}

// src/codegen/bundle-modules.ts
init_replacements();
var BASE = path5.join("/Volumes/Data/src/bun/src/codegen", "../js");
var debug2 = process.argv[2] === "--debug=ON";
var CMAKE_BUILD_ROOT2 = process.argv[3];
var timeString = 'Bundled "src/js" for ' + (debug2 ? "development" : "production");
console.time(timeString);
if (!CMAKE_BUILD_ROOT2) {
  console.error("Usage: bun bundle-modules.ts --debug=[OFF|ON] <CMAKE_WORK_DIR>");
  process.exit(1);
}
globalThis.CMAKE_BUILD_ROOT = CMAKE_BUILD_ROOT2;
var bundleBuiltinFunctions2 = (init_bundle_functions(), __toCommonJS(bundle_functions_exports)).bundleBuiltinFunctions;
var TMP_DIR2 = path5.join(CMAKE_BUILD_ROOT2, "tmp_modules");
var CODEGEN_DIR2 = path5.join(CMAKE_BUILD_ROOT2, "codegen");
var JS_DIR = path5.join(CMAKE_BUILD_ROOT2, "js");
var t = new Bun.Transpiler({ loader: "tsx" });
var start = performance.now();
var silent = process.env.BUN_SILENT === "1" || process.env.CLAUDECODE;
function markVerbose(log) {
  const now = performance.now();
  console.log(`${log} (${(now - start).toFixed(0)}ms)`);
  start = now;
}
var mark = silent ? (log) => {
} : markVerbose;
var { moduleList, nativeModuleIds, nativeModuleEnumToId, nativeModuleEnums, requireTransformer, nativeStartIndex } = createInternalModuleRegistry(BASE);
globalThis.requireTransformer = requireTransformer;
var verbose = Bun.env.VERBOSE ? console.log : () => {
};
async function retry(n, fn) {
  var err;
  while (n > 0) {
    try {
      await fn();
      return;
    } catch (e) {
      err = e;
      n--;
      await Bun.sleep(5);
    }
  }
  throw err;
}
var bunRepoRoot = path5.join(CMAKE_BUILD_ROOT2, "..", "..");
var bundledEntryPoints = [];
for (let i = 0; i < nativeStartIndex; i++) {
  try {
    const file = path5.join(BASE, moduleList[i]);
    let input = fs4.readFileSync(file, "utf8");
    if (!/\bexport\s+(?:function|class|const|default|{)/.test(input)) {
      if (input.includes("module.exports")) {
        throw new Error(
          "Do not use CommonJS module.exports in ESM modules. Use `export default { ... }` instead. See src/js/README.md"
        );
      } else {
        throw new Error(
          `Internal modules must have at least one ESM export statement in '${path5.relative(bunRepoRoot, file)}' \u2014 see src/js/README.md`
        );
      }
    }
    const scannedImports = t.scan(input);
    for (const imp of scannedImports.imports) {
      if (imp.kind === "import-statement") {
        isBuiltin = true;
        try {
          if (!builtinModules.includes(imp.path)) {
            requireTransformer(imp.path, moduleList[i]);
          }
        } catch {
          isBuiltin = false;
        }
        if (isBuiltin) {
          const err = new Error(
            `Cannot use ESM import statement within builtin modules. Use require("${imp.path}") instead. See src/js/README.md (from ${moduleList[i]})`
          );
          err.name = "BunError";
          err["fileName"] = moduleList[i];
          throw err;
        }
      }
    }
    if (scannedImports.exports.includes("default") && scannedImports.exports.length > 1) {
      const err = new Error(
        `Using \`export default\` AND named exports together in builtin modules is unsupported. See src/js/README.md (from ${moduleList[i]})`
      );
      err.name = "BunError";
      err["fileName"] = moduleList[i];
      throw err;
    }
    let importStatements = [];
    const processed = sliceSourceCode(
      "{" + input.replace(
        /\bimport(\s*type)?\s*(\{[^}]*\}|(\*\s*as)?\s[a-zA-Z0-9_$]+)\s*from\s*['"][^'"]+['"]/g,
        (stmt) => (importStatements.push(stmt), "")
      ).replace(/export\s*{\s*}\s*;/g, ""),
      true,
      (x) => requireTransformer(x, moduleList[i])
    );
    let fileToTranspile = `// GENERATED TEMP FILE - DO NOT EDIT
// Sourced from src/js/${moduleList[i]}
${importStatements.join("\n")}

${processed.result.slice(1).trim()}
;$$EXPORT$$(__intrinsic__exports).$$EXPORT_END$$;
`;
    let exportOptimization = false;
    fileToTranspile = fileToTranspile.replace(
      /__intrinsic__exports\s*=\s*(.*|.*\{[^\}]*}|.*\([^\)]*\))\n+\s*\$\$EXPORT\$\$\(__intrinsic__exports\).\$\$EXPORT_END\$\$;/,
      (_, a) => {
        exportOptimization = true;
        return "$$EXPORT$$(" + a.replace(/;$/, "") + ").$$EXPORT_END$$;";
      }
    );
    if (!exportOptimization) {
      fileToTranspile = `var $;` + fileToTranspile.replaceAll("__intrinsic__exports", "$");
    }
    const outputPath = path5.join(TMP_DIR2, moduleList[i].slice(0, -3) + ".ts");
    await mkdir(path5.dirname(outputPath), { recursive: true });
    if (!fs4.existsSync(path5.dirname(outputPath))) {
      verbose("directory did not exist after mkdir twice:", path5.dirname(outputPath));
    }
    fileToTranspile = "// @ts-nocheck\n" + fileToTranspile;
    try {
      await writeFile(outputPath, fileToTranspile);
      if (!fs4.existsSync(outputPath)) {
        verbose("file did not exist after write:", outputPath);
        throw new Error("file did not exist after write: " + outputPath);
      }
      verbose("wrote to", outputPath, "successfully");
    } catch {
      await retry(3, async () => {
        await mkdir(path5.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, fileToTranspile);
        if (!fs4.existsSync(outputPath)) {
          verbose("file did not exist after write:", outputPath);
          throw new Error("file did not exist after write: " + outputPath);
        }
        verbose("wrote to", outputPath, "successfully later");
      });
    }
    bundledEntryPoints.push(outputPath);
  } catch (error) {
    console.error(error);
    console.error(`While processing: ${moduleList[i]}`);
    process.exit(1);
  }
}
var isBuiltin;
mark("Preprocess modules");
var config_cli = [
  process.execPath,
  "build",
  ...bundledEntryPoints,
  ...debug2 ? [] : ["--minify-syntax", "--keep-names"],
  "--root",
  TMP_DIR2,
  "--target",
  "bun",
  ...builtinModules.map((x) => ["--external", x]).flat(),
  ...Object.keys(define).map((x) => [`--define`, `${x}=${define[x]}`]).flat(),
  "--define",
  `IS_BUN_DEVELOPMENT=${String(!!debug2)}`,
  "--define",
  `__intrinsic__debug=${debug2 ? "$debug_log_enabled" : "false"}`,
  "--outdir",
  path5.join(TMP_DIR2, "modules_out")
];
verbose("running: ", config_cli);
var out = Bun.spawnSync({
  cmd: config_cli,
  cwd: process.cwd(),
  env: process.env,
  stdio: ["pipe", "pipe", "pipe"]
});
if (out.exitCode !== 0) {
  console.error(out.stderr.toString());
  process.exit(out.exitCode);
}
mark("Bundle modules");
var outputs = /* @__PURE__ */ new Map();
for (const entrypoint of bundledEntryPoints) {
  const file_path = entrypoint.slice(TMP_DIR2.length + 1).replace(/\.ts$/, ".js");
  const file_path_full = path5.join(TMP_DIR2, "modules_out", file_path);
  const output = fs4.readFileSync(file_path_full, "utf-8");
  let captured = `(function (){${output.replace("// @bun\n", "").trim()}})`;
  let usesDebug = output.includes("$debug_log");
  let usesAssert = output.includes("$assert");
  captured = captured.replace(/\$\$EXPORT\$\$\((.*)\).\$\$EXPORT_END\$\$;/, "return $1").replace(/]\s*,\s*__(debug|assert)_end__\)/g, ")").replace(/]\s*,\s*__debug_end__\)/g, ")").replace(/import.meta.require\((.*?)\)/g, (expr, specifier) => {
    throw new Error(`Builtin Bundler: do not use __require() (in ${file_path}))`);
  }).replace(/return \$\nexport /, "return").replace(/__intrinsic__/g, "@").replace(/__no_intrinsic__/g, "") + "\n";
  captured = captured.replace(
    /function\s*\(.*?\)\s*{/,
    '$&"use strict";' + (usesDebug ? createLogClientJS(
      file_path.replace(".js", ""),
      idToPublicSpecifierOrEnumName(file_path).replace(/^node:|^bun:/, "")
    ) : "") + (usesAssert ? createAssertClientJS(idToPublicSpecifierOrEnumName(file_path).replace(/^node:|^bun:/, "")) : "")
  );
  const errors2 = [...captured.matchAll(/@bundleError\((.*)\)/g)];
  if (errors2.length) {
    throw new Error(`Errors in ${entrypoint}:
${errors2.map((x) => x[1]).join("\n")}`);
  }
  const outputPath = path5.join(JS_DIR, file_path);
  fs4.mkdirSync(path5.dirname(outputPath), { recursive: true });
  fs4.writeFileSync(outputPath, captured);
  outputs.set(file_path.replace(".js", ""), captured);
}
mark("Postprocesss modules");
function idToEnumName(id) {
  return id.replace(/\.[mc]?[tj]s$/, "").replace(/[^a-zA-Z0-9]+/g, " ").split(" ").map((x) => ["jsc", "ffi", "vm", "tls", "os", "ws", "fs", "dns"].includes(x) ? x.toUpperCase() : cap(x)).join("");
}
function idToPublicSpecifierOrEnumName(id) {
  if (id === "internal-for-testing.ts") return "bun:internal-for-testing";
  id = id.replace(/\.[mc]?[tj]s$/, "");
  if (id.startsWith("node/")) {
    return "node:" + id.slice(5).replaceAll(".", "/");
  } else if (id.startsWith("bun/")) {
    return "bun:" + id.slice(4).replaceAll(".", "/");
  } else if (id.startsWith("internal/")) {
    return "internal:" + id.slice(9).replaceAll(".", "/");
  } else if (id.startsWith("thirdparty/")) {
    return id.slice(11).replaceAll(".", "/");
  }
  return idToEnumName(id);
}
await bundleBuiltinFunctions2({
  requireTransformer
});
mark("Bundle Functions");
writeIfNotChanged(
  path5.join(CODEGEN_DIR2, "InternalModuleRegistry+numberOfModules.h"),
  `#define BUN_INTERNAL_MODULE_COUNT ${moduleList.length}
#define BUN_NATIVE_MODULE_START_INDEX ${nativeStartIndex}
`
);
writeIfNotChanged(
  path5.join(CODEGEN_DIR2, "InternalModuleRegistry+enum.h"),
  `${moduleList.map((id, n) => {
    return `${idToEnumName(id)} = ${n},`;
  }).join("\n") + "\n"}
`
);
writeIfNotChanged(
  path5.join(CODEGEN_DIR2, "InternalModuleRegistry+createInternalModuleById.h"),
  `// clang-format off
JSValue InternalModuleRegistry::createInternalModuleById(JSGlobalObject* globalObject, VM& vm, Field id)
{
  switch (id) {
    // JS internal modules
    ${moduleList.map((id, n) => {
    const moduleName = idToPublicSpecifierOrEnumName(id);
    const fileBase = JSON.stringify(id.replace(/\.[mc]?[tj]s$/, ".js"));
    const urlString = "builtin://" + id.replace(/\.[mc]?[tj]s$/, "").replace(/[^a-zA-Z0-9]+/g, "/");
    const inner = n >= nativeStartIndex ? `return generateNativeModule(globalObject, vm, generateNativeModule_${nativeModuleEnums[id]});` : `INTERNAL_MODULE_REGISTRY_GENERATE(globalObject, vm, "${moduleName}"_s, ${fileBase}_s, InternalModuleRegistryConstants::${idToEnumName(id)}Code, "${urlString}"_s);`;
    return `case Field::${idToEnumName(id)}: {
      ${inner}
    }`;
  }).join("\n    ")}
    default: {
      __builtin_unreachable();
    }
  }
  __builtin_unreachable();
}
`
);
if (!debug2) {
  writeIfNotChanged(
    path5.join(CODEGEN_DIR2, "InternalModuleRegistryConstants.h"),
    `// clang-format off
#pragma once

namespace Bun {
namespace InternalModuleRegistryConstants {
  ${moduleList.slice(0, nativeStartIndex).map((id, n) => {
      const out2 = outputs.get(id.slice(0, -3).replaceAll("/", path5.sep));
      if (!out2) {
        throw new Error(`Missing output for ${id}`);
      }
      return declareASCIILiteral(`${idToEnumName(id)}Code`, out2);
    }).join("\n")}
}
}`
  );
} else {
  writeIfNotChanged(
    path5.join(CODEGEN_DIR2, "InternalModuleRegistryConstants.h"),
    `// clang-format off
#pragma once

namespace Bun {
namespace InternalModuleRegistryConstants {
  ${moduleList.slice(0, nativeStartIndex).map((id, n) => `${declareASCIILiteral(`${idToEnumName(id)}Code`, "")}`).join("\n")}
}
}`
  );
}
writeIfNotChanged(
  path5.join(CODEGEN_DIR2, "ResolvedSourceTag.zig"),
  `// zig fmt: off
pub const ResolvedSourceTag = enum(u32) {
    javascript = 0,
    package_json_type_module = 1,
    package_json_type_commonjs = 2,
    wasm = 3,
    object = 4,
    file = 5,
    esm = 6,
    json_for_object_loader = 7,
    /// Generate an object with "default" set to all the exports, including a "default" property
    exports_object = 8,
    /// Generate a module that only exports default the input JSValue
    export_default_object = 9,
    /// Signal upwards that the matching value in 'require.extensions' should be used.
    common_js_custom_extension = 10,

    // Built in modules are loaded through InternalModuleRegistry by numerical ID.
    // In this enum are represented as \`(1 << 9) & id\`
${moduleList.slice(0, nativeStartIndex).map((id, n) => `    @"${idToPublicSpecifierOrEnumName(id)}" = ${1 << 9 | n},`).join("\n")}
    // Native modules come after the JS modules
${Object.entries(nativeModuleEnumToId).map(([id, n], i) => `    @"${moduleList[nativeStartIndex + i]}" = ${1 << 9 | n + nativeStartIndex},`).join("\n")}
};
`
);
writeIfNotChanged(
  path5.join(CODEGEN_DIR2, "SyntheticModuleType.h"),
  `enum SyntheticModuleType : uint32_t {
    JavaScript = 0,
    PackageJSONTypeModule = 1,
    PackageJSONTypeCommonJS = 2,
    Wasm = 3,
    ObjectModule = 4,
    File = 5,
    ESM = 6,
    JSONForObjectLoader = 7,
    ExportsObject = 8,
    ExportDefaultObject = 9,
    CommonJSCustomExtension = 10,
    // Built in modules are loaded through InternalModuleRegistry by numerical ID.
    // In this enum are represented as \`(1 << 9) & id\`
    InternalModuleRegistryFlag = 1 << 9,
${moduleList.slice(0, nativeStartIndex).map((id, n) => `    ${idToEnumName(id)} = ${1 << 9 | n},`).join("\n")}
    // Native modules come after the JS modules
${Object.entries(nativeModuleEnumToId).map(([id, n], i) => `    ${id} = ${1 << 9 | i + nativeStartIndex},`).join("\n")}
};

`
);
writeIfNotChanged(
  path5.join(CODEGEN_DIR2, "NativeModuleImpl.h"),
  Object.values(nativeModuleEnums).map((value) => `#include "../../jsc/modules/${value}Module.h"`).join("\n") + "\n"
);
writeIfNotChanged(path5.join(CODEGEN_DIR2, "GeneratedJS2Native.h"), getJS2NativeCPP());
var js2nativeZigPath = path5.join("/Volumes/Data/src/bun/src/codegen", "../jsc/bindings/GeneratedJS2Native.zig");
writeIfNotChanged(js2nativeZigPath, getJS2NativeZig(js2nativeZigPath));
var generatedDTSPath = path5.join(CODEGEN_DIR2, "generated.d.ts");
writeIfNotChanged(
  generatedDTSPath,
  (() => {
    let dts = `
// GENERATED TEMP FILE - DO NOT EDIT
// generated by ${import.meta.path}

declare module "module" {
  global {
    interface PropertyDescriptor {
      __proto__?: any;
    }

    interface Function {
      readonly $call: Function.prototype["call"];
      readonly $apply: Function.prototype["apply"];
    }

    namespace NodeJS {
      interface Require {

`;
    dts += `        (id: "bun"): typeof import("bun");
`;
    dts += `        (id: "bun:test"): typeof import("bun:test");
`;
    dts += `        (id: "bun:jsc"): typeof import("bun:jsc");
`;
    for (let i = 0; i < nativeStartIndex; i++) {
      const id = moduleList[i];
      const out2 = outputs.get(id.slice(0, -3).replaceAll("/", path5.sep));
      if (!out2) {
        throw new Error(`Missing output for ${id}`);
      }
      let internalName = idToPublicSpecifierOrEnumName(id);
      if (internalName.startsWith("internal:")) internalName = internalName.replace(":", "/");
      dts += `        (id: "${internalName}"): typeof import("${path5.join(BASE, id)}").default;
`;
    }
    dts += `
      }
    }
  }
}
`;
    for (const [name] of js_classes_default) {
      dts += `
declare function $inherits${name}(value: any): value is ${name};`;
    }
    return dts;
  })()
);
mark("Generate Code");
var evalFiles = new Bun.Glob(path5.join(BASE, "eval", "*.ts")).scanSync();
for (const file of evalFiles) {
  const {
    outputs: [output]
  } = await Bun.build({
    entrypoints: [file],
    // Shrink it.
    minify: !debug2,
    target: "bun",
    format: "esm",
    env: "disable",
    define: {
      "process.platform": JSON.stringify(process.env.TARGET_PLATFORM ?? process.platform),
      "process.arch": JSON.stringify(process.env.TARGET_ARCH ?? process.arch)
    }
  });
  writeIfNotChanged(path5.join(CODEGEN_DIR2, "eval", path5.basename(file)), await output.text());
}
if (!silent) {
  console.log("");
  console.timeEnd(timeString);
  console.log(
    `  %s kb`,
    Math.floor(
      (moduleList.slice(0, nativeStartIndex).reduce((a, b) => a + outputs.get(b.slice(0, -3).replaceAll("/", path5.sep)).length, 0) + globalThis.internalFunctionJSSize) / 1e3
    )
  );
  console.log(`  %s internal modules`, nativeStartIndex);
  console.log(`  %s native modules`, Object.keys(nativeModuleIds).length);
  console.log(
    `  %s internal functions across %s files`,
    globalThis.internalFunctionCount,
    globalThis.internalFunctionFileCount
  );
}
