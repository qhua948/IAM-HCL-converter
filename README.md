# IAM-HCL-conveter

This is a very simple library which converts AWS IAM JSON policies to
`terraform`'s [`aws_iam_policy_document`](https://www.terraform.io/docs/providers/aws/d/iam_policy_document.html).

# License

AGPL V3

# Usage
```javascript
import Converter from "iam-hcl-converter"
    const converter = new Converter(2);
    const res = converter.convert("<JSON POLICY>");
    console.log(res);
```