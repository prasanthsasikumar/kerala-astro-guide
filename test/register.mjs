// Registers the "@private/..." resolver for Node (tests and scripts): node --import ./test/register.mjs
import { register } from "node:module";
register("./loader.mjs", import.meta.url);
