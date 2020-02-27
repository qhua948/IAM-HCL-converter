import _ from "lodash";
import fs from "fs";
import chalk from "chalk";

export function main() {
  let buffer = fs.readFileSync(0);
  const converter = new Converter(2);
  const data = converter.convert(buffer.toString());
  console.log(data);
}

interface IAMPolicy {
  version: string;
  policy_id: string;
  statements: IAMPolicyStatement[];
}

interface IAMPolicyStatement {
  sid: string;
  effect: string;
  actions: string[];
  not_actions: string[];
  resources: string[];
  not_resources: string[];
  principals: IAMPolicyPrincipal[];
  not_principals: IAMPolicyPrincipal[];
  condition: IAMPolicyCondition;
}

interface IAMPolicyPrincipal {
  type: string;
  identifiers: string[];
}

interface IAMPolicyCondition {
  test: string;
  variable: string;
  value: string[];
}

class Indenter {

  indentBase: number;
  currIndent: number;
  stringer: string[];

  public constructor(indent: number, stringer: string[]) {
    this.indentBase = indent;
    this.currIndent = indent;
    this.stringer = stringer;
  }

  public inc() {
    this.currIndent += this.indentBase;
  }

  public dec() {
    this.currIndent = _.max([0, this.currIndent - this.indentBase]) as number
  }

  public logWithIndent(msg: string) {
    this.stringer.push(_.repeat(' ', this.currIndent) + msg);
  }

  public logListWithIndent(header: string, msgs: string[]) {
    this.logWithIndent(`${header} = [`);
    this.inc();
    msgs.forEach(e => this.logWithIndent(`\"${e}\",`));
    this.dec();
    this.logWithIndent(']');
  }
}

export class Converter {
  indenter: Indenter;
  stringer: Array<string>;

  public constructor(indent: number = 2) {
    this.stringer = [];
    this.indenter = new Indenter(indent, this.stringer);
  }

  appendStringLn(str: string) {
    this.stringer.push(str);
  }

  public convert(json: string) {
    const parsed = JSON.parse(json);
    
    // Do sanity check
    if (!_.has(parsed, 'Statement')) {
      Converter.fail("No Statment clause found", 1)
    }

    if (_.has(parsed, 'Version')) {
      this.appendStringLn(`version = \"${parsed['Version']}\"`);
    }

    if (_.has(parsed, 'Id')) {
      this.appendStringLn(`policy_id = \"${parsed['Id']}\"`);
    }

    if (_.isArray(parsed['Statement'])) {
      // Statments is an array
      parsed['Statement'].forEach(e => this.processStatements(e));
    } else {
      this.processStatements(parsed['Statement']);
    }

    if (_.has(parsed, 'Principal')) {
      if (_.isArray(parsed['Principal'])) {
        // Principal is an array
        parsed['Principal'].forEach(e => this.processPrincipal(e));
      } else {
        this.processPrincipal(parsed['Principal']);
      }
    }

    if (_.has(parsed, 'NotPrincipal')) {
      if (_.isArray(parsed['NotPrincipal'])) {
        // Principal is an array
        parsed['NotPrincipal'].forEach(e => this.processPrincipal(e, true));
      } else {
        this.processPrincipal(parsed['NotPrincipal']);
      }
    }

    if (_.has(parsed, 'Condition')) {
      if (_.isArray(parsed['Condition'])) {
        // Condition is an array
        parsed['Condition'].forEach(e => this.processCondition(e));
      } else {
        this.processCondition(parsed['Condition']);
      }
    }

    return _.join(this.stringer, '\n');
  }

  static arrayify(obj: any): object[] {
    if (_.isArray(obj)) {
      return obj;
    } else {
      return [obj];
    }
  }

  processArray(chunk: any, header: string, jsonKey: string) {
    if (!_.has(chunk, jsonKey)) {
      return;
    }

    this.indenter.logListWithIndent(header, Converter.arrayify(_.get(chunk, jsonKey)).map(e => e.toString()));
  }

  processCondition(condition: any) {
    this.appendStringLn('condition {');

    const ckeys = _.keys(condition);
    if (ckeys.length > 1) {
      Converter.fail('Condition has too many keys');
    }

    this.indenter.logWithIndent(`test = \"${ckeys[0]}`);

    const vkeys = _.keys(_.get(condition, ckeys[0]));
    if (vkeys.length > 1) {
      Converter.fail('Condition has too many variable keys');
    }

    this.indenter.logWithIndent(`variable = \"${vkeys[0]}`);
    
    this.processArray(_.get(condition, ckeys[0]), 'values', vkeys[0]);
  }

  processPrincipal(principal: any, not: boolean = false) {
    this.appendStringLn(`${not ? 'not_': ''}principal {`);

    // Check if it is wildcard principal
    if (principal === '*') {
      principal = { AWS: '*' };
    }

    const pkeys = _.keys(principal)
    if (pkeys.length > 1) {
      Converter.fail('Principal has too many keys');
    }

    this.indenter.logWithIndent(`type = \"${pkeys[0]}`);

    this.processArray(principal, 'identifiers', pkeys[0]);
  }

  processStatements(chunk: any) {
    this.appendStringLn('statement {');

    if (_.has(chunk, 'Sid')) {
      this.indenter.logWithIndent(`sid = \"${chunk['Sid']}`);
    }

    const effect = _.get(chunk, 'Effect', 'Allow'); // Defaults to Allow
    this.indenter.logWithIndent(`effect = \"${effect}\"`);

    arrayToProcess.forEach(e => {
      this.processArray(chunk, e[0], e[1]);
    });

    this.appendStringLn('}');
  }

  public static fail(message: string, code: number = 1) {
    chalk.red(`${message}`);
    process.exit(code);
  }
}

const arrayToProcess = [
  ["actions", "Action"],
  ["not_actions", "NotAction"],
  ["resources", "Resource"],
  ["not_resource", "NotResource"],
];

main();