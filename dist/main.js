"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var lodash_1 = __importDefault(require("lodash"));
var fs_1 = __importDefault(require("fs"));
var chalk_1 = __importDefault(require("chalk"));
function main() {
    var buffer = fs_1["default"].readFileSync(0);
    var converter = new Converter(2);
    var data = converter.convert(buffer.toString());
    console.log(data);
}
exports.main = main;
var Indenter = /** @class */ (function () {
    function Indenter(indent, stringer) {
        this.indentBase = indent;
        this.currIndent = indent;
        this.stringer = stringer;
    }
    Indenter.prototype.inc = function () {
        this.currIndent += this.indentBase;
    };
    Indenter.prototype.dec = function () {
        this.currIndent = lodash_1["default"].max([0, this.currIndent - this.indentBase]);
    };
    Indenter.prototype.logWithIndent = function (msg) {
        this.stringer.push(lodash_1["default"].repeat(' ', this.currIndent) + msg);
    };
    Indenter.prototype.logListWithIndent = function (header, msgs) {
        var _this = this;
        this.logWithIndent(header + " = [");
        this.inc();
        msgs.forEach(function (e) { return _this.logWithIndent("\"" + e + "\","); });
        this.dec();
        this.logWithIndent(']');
    };
    return Indenter;
}());
var Converter = /** @class */ (function () {
    function Converter(indent) {
        if (indent === void 0) { indent = 2; }
        this.stringer = [];
        this.indenter = new Indenter(indent, this.stringer);
    }
    Converter.prototype.appendStringLn = function (str) {
        this.stringer.push(str);
    };
    Converter.prototype.convert = function (json) {
        var _this = this;
        var parsed = JSON.parse(json);
        // Do sanity check
        if (!lodash_1["default"].has(parsed, 'Statement')) {
            Converter.fail("No Statment clause found", 1);
        }
        if (lodash_1["default"].has(parsed, 'Version')) {
            this.appendStringLn("version = \"" + parsed['Version'] + "\"");
        }
        if (lodash_1["default"].has(parsed, 'Id')) {
            this.appendStringLn("policy_id = \"" + parsed['Id'] + "\"");
        }
        if (lodash_1["default"].isArray(parsed['Statement'])) {
            // Statments is an array
            parsed['Statement'].forEach(function (e) { return _this.processStatements(e); });
        }
        else {
            this.processStatements(parsed['Statement']);
        }
        if (lodash_1["default"].has(parsed, 'Principal')) {
            if (lodash_1["default"].isArray(parsed['Principal'])) {
                // Principal is an array
                parsed['Principal'].forEach(function (e) { return _this.processPrincipal(e); });
            }
            else {
                this.processPrincipal(parsed['Principal']);
            }
        }
        if (lodash_1["default"].has(parsed, 'NotPrincipal')) {
            if (lodash_1["default"].isArray(parsed['NotPrincipal'])) {
                // Principal is an array
                parsed['NotPrincipal'].forEach(function (e) { return _this.processPrincipal(e, true); });
            }
            else {
                this.processPrincipal(parsed['NotPrincipal']);
            }
        }
        if (lodash_1["default"].has(parsed, 'Condition')) {
            if (lodash_1["default"].isArray(parsed['Condition'])) {
                // Condition is an array
                parsed['Condition'].forEach(function (e) { return _this.processCondition(e); });
            }
            else {
                this.processCondition(parsed['Condition']);
            }
        }
        return lodash_1["default"].join(this.stringer, '\n');
    };
    Converter.arrayify = function (obj) {
        if (lodash_1["default"].isArray(obj)) {
            return obj;
        }
        else {
            return [obj];
        }
    };
    Converter.prototype.processArray = function (chunk, header, jsonKey) {
        if (!lodash_1["default"].has(chunk, jsonKey)) {
            return;
        }
        this.indenter.logListWithIndent(header, Converter.arrayify(lodash_1["default"].get(chunk, jsonKey)).map(function (e) { return e.toString(); }));
    };
    Converter.prototype.processCondition = function (condition) {
        this.appendStringLn('condition {');
        var ckeys = lodash_1["default"].keys(condition);
        if (ckeys.length > 1) {
            Converter.fail('Condition has too many keys');
        }
        this.indenter.logWithIndent("test = \"" + ckeys[0]);
        var vkeys = lodash_1["default"].keys(lodash_1["default"].get(condition, ckeys[0]));
        if (vkeys.length > 1) {
            Converter.fail('Condition has too many variable keys');
        }
        this.indenter.logWithIndent("variable = \"" + vkeys[0]);
        this.processArray(lodash_1["default"].get(condition, ckeys[0]), 'values', vkeys[0]);
    };
    Converter.prototype.processPrincipal = function (principal, not) {
        if (not === void 0) { not = false; }
        this.appendStringLn((not ? 'not_' : '') + "principal {");
        // Check if it is wildcard principal
        if (principal === '*') {
            principal = { AWS: '*' };
        }
        var pkeys = lodash_1["default"].keys(principal);
        if (pkeys.length > 1) {
            Converter.fail('Principal has too many keys');
        }
        this.indenter.logWithIndent("type = \"" + pkeys[0]);
        this.processArray(principal, 'identifiers', pkeys[0]);
    };
    Converter.prototype.processStatements = function (chunk) {
        var _this = this;
        this.appendStringLn('statement {');
        if (lodash_1["default"].has(chunk, 'Sid')) {
            this.indenter.logWithIndent("sid = \"" + chunk['Sid']);
        }
        var effect = lodash_1["default"].get(chunk, 'Effect', 'Allow'); // Defaults to Allow
        this.indenter.logWithIndent("effect = \"" + effect + "\"");
        arrayToProcess.forEach(function (e) {
            _this.processArray(chunk, e[0], e[1]);
        });
        this.appendStringLn('}');
    };
    Converter.fail = function (message, code) {
        if (code === void 0) { code = 1; }
        chalk_1["default"].red("" + message);
        process.exit(code);
    };
    return Converter;
}());
exports.Converter = Converter;
var arrayToProcess = [
    ["actions", "Action"],
    ["not_actions", "NotAction"],
    ["resources", "Resource"],
    ["not_resource", "NotResource"],
];
main();
