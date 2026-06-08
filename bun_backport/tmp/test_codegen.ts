import * as b from "bindgenv2";
console.log("bindgenv2 exports:", Object.keys(b));

import { SSLConfig } from "/Volumes/Data/src/bun/src/runtime/socket/SSLConfig.bindv2";
console.log("SSLConfig name:", SSLConfig.name);
console.log("SSLConfig hasCppSource:", SSLConfig.hasCppSource);
console.log("SSLConfig hasZigSource:", SSLConfig.hasZigSource);
