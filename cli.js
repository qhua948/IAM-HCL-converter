"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var fs_1 = __importDefault(require("fs"));
var main_1 = __importDefault(require("./main"));
function main() {
    var buffer = fs_1["default"].readFileSync(0);
    var converter = new main_1["default"](2);
    var data = converter.convert(buffer.toString());
    console.log(data);
}
exports.main = main;
main();
