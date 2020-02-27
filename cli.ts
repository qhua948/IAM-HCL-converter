import fs from "fs";
import Converter from "./main";

export function main() {
  let buffer = fs.readFileSync(0);
  const converter = new Converter(2);
  const data = converter.convert(buffer.toString());
  console.log(data);
}
