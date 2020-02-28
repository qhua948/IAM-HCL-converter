import _ from "lodash";

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
    this.currIndent = _.max([0, this.currIndent - this.indentBase]) as number;
  }

  public logWithIndent(msg: string) {
    this.stringer.push(_.repeat(" ", this.currIndent) + msg);
  }

  public logListWithIndent(header: string, msgs: string[]) {
    this.logWithIndent(`${header} = [`);
    this.inc();
    msgs.forEach(e => this.logWithIndent(`\"${e}\",`));
    this.dec();
    this.logWithIndent("]");
  }
}

export default class Converter {
  indenter: Indenter;
  stringer: Array<string>;

  public constructor(indent: number = 2) {
    this.stringer = [];
    this.indenter = new Indenter(indent, this.stringer);
  }

  appendStringLn(str: string) {
    this.stringer.push(str);
  }

  public convert(json: string): string {
    const parsed = JSON.parse(json);

    // Do sanity check
    if (!_.has(parsed, "Statement")) {
      Converter.fail("No Statment clause found");
    }

    if (_.has(parsed, "Version")) {
      this.appendStringLn(`version = \"${parsed["Version"]}\"`);
    }

    if (_.has(parsed, "Id")) {
      this.appendStringLn(`policy_id = \"${parsed["Id"]}\"`);
    }

    const curriedProcessNotPrincipalFn = (p: string) => {
      return this.processPrincipal(p, false);
    };

    const processList: Array<Array<any>> = [
      ["Statement", this.processStatements],
      ["Principal", this.processPrincipal],
      ["NotPrincipal", curriedProcessNotPrincipalFn],
      ["Condition", this.processCondition]
    ];
    let that = this;
    processList.forEach(e => {
      if (_.has(parsed, e[0])) {
        if (_.isArray(parsed[e[0]])) {
          parsed[e[0]].forEach((i: Array<any>) => e[1].bind(that)(i));
        } else {
          e[1].bind(that)(parsed[e[0]]);
        }
      }
    });

    return _.join(this.stringer, "\n");
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

    this.indenter.logListWithIndent(
      header,
      Converter.arrayify(_.get(chunk, jsonKey)).map(e => e.toString())
    );
  }

  processCondition(condition: any) {
    this.appendStringLn("condition {");

    const ckeys = _.keys(condition);
    if (ckeys.length > 1) {
      Converter.fail("Condition has too many keys");
    }

    this.indenter.logWithIndent(`test = \"${ckeys[0]}`);

    const vkeys = _.keys(_.get(condition, ckeys[0]));
    if (vkeys.length > 1) {
      Converter.fail("Condition has too many variable keys");
    }

    this.indenter.logWithIndent(`variable = \"${vkeys[0]}`);

    this.processArray(_.get(condition, ckeys[0]), "values", vkeys[0]);
  }

  processPrincipal(principal: any, not: boolean = false) {
    this.appendStringLn(`${not ? "not_" : ""}principal {`);

    // Check if it is wildcard principal
    if (principal === "*") {
      principal = { AWS: "*" };
    }

    const pkeys = _.keys(principal);
    if (pkeys.length > 1) {
      Converter.fail("Principal has too many keys");
    }

    this.indenter.logWithIndent(`type = \"${pkeys[0]}\"`);

    this.processArray(principal, "identifiers", pkeys[0]);
  }

  processStatements(chunk: any) {
    this.appendStringLn("statement {");

    if (_.has(chunk, "Sid")) {
      this.indenter.logWithIndent(`sid = \"${chunk["Sid"]}`);
    }

    const effect = _.get(chunk, "Effect", "Allow"); // Defaults to Allow
    this.indenter.logWithIndent(`effect = \"${effect}\"`);

    arrayToProcess.forEach(e => {
      this.processArray(chunk, e[0], e[1]);
    });

    this.appendStringLn("}");
  }

  public static fail(message: string) {
    throw new Error(message);
  }
}

const arrayToProcess = [
  ["actions", "Action"],
  ["not_actions", "NotAction"],
  ["resources", "Resource"],
  ["not_resource", "NotResource"]
];
