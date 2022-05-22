"use strict";

function Const(value) {
    this.value = value;
}

Const.prototype = {
    evaluate: function (x, y, z) {
        return this.value;
    },

    toString: function () {
        return this.value.toString();
    },

    prefix: function () {
        return this.toString();
    }
};

function Variable(str) {
    this.str = str;
}

Variable.prototype = {
    variables: new Map([["x", 0], ["y", 1], ["z", 2]]),

    evaluate: function (...args) {
        return args[this.variables.get(this.str)];
    },

    toString: function () {
        return this.str;
    },

    prefix: function () {
        return this.toString();
    }
};

function Operation(calc, operator) {
    this.calc = calc;
    this.operator = operator;
}

Operation.prototype = {
    evaluate: function (x, y, z) {
        return this.calc(this.args.map(
            function f(currentValue) {
                return currentValue.evaluate(x, y, z);
            }));
    },

    toString: function () {
        return this.args.join(" ") + " " + this.operator;
    },

    prefix: function () {
        return `(${this.operator} ${(this.args.map(
            function f(currentValue) {
                return currentValue.prefix();
            })).join(" ")})`
    }
};

function Add(...args) {
    this.args = args;
}

Add.prototype = new Operation((args) => args.reduce(function (sum, elem) {
    return sum + elem;
}, 0), "+");

function Subtract(...args) {
    this.args = args;
}

Subtract.prototype = new Operation((args) => args[0] - args[1], "-");

function Multiply(...args) {
    this.args = args;
}

Multiply.prototype = new Operation((args) => args.reduce(function (mul, elem) {
    return mul * elem;
}, 1), "*");

function Divide(...args) {
    this.args = args;
}

Divide.prototype = new Operation((args) => args[0] / args[1], "/");

function Negate(...args) {
    this.args = args;
}

Negate.prototype = new Operation((args) => -args[0], "negate");

function Avg5(...args) {
    this.args = args;
}

const calc5 = function (args) {
    let result = args.reduce(function (sum, elem) {
        return sum + elem;
    }, 0);
    return result / args.length;
}

Avg5.prototype = new Operation(calc5, "avg5");

function Med3(...args) {
    this.args = args;
}

const calc3 = function (args) {
    if ((args[1] <= args[0] && args[0] <= args[2]) || (args[2] <= args[0] && args[0] <= args[1])) {
        return args[0];
    } else if ((args[0] <= args[1] && args[1] <= args[2]) || (args[2] <= args[1] && args[1] <= args[0])) {
        return args[1];
    } else {
        return args[2];
    }
}
Med3.prototype = new Operation(calc3, "med3");

function ArithMean(...args) {
    this.args = args;
}

ArithMean.prototype = new Operation((args) => {
    let result = args.reduce(function (sum, elem) {
        return sum + elem;
    }, 0);
    return result / args.length;
}, "arith-mean");

function GeomMean(...args) {
    this.args = args;
}

GeomMean.prototype = new Operation((args) => {
    let result = args.reduce(function (mul, elem) {
        return mul * elem;
    }, 1);
    return Math.pow(Math.abs(result), 1 / args.length);
}, "geom-mean");

function HarmMean(...args) {
    this.args = args;
}

HarmMean.prototype = new Operation((args) => {
    let result = args.reduce(function (sum, elem) {
        return sum + 1 / elem;
    }, 0);
    return args.length / result;
}, "harm-mean");

function ParseError(message) {
    this.message = message;
}

let currentIndex = 0;

function parsePrefix(str) {
    str = str.trim();
    if (str.length === 0) {
        throw new ParseError("Empty string");
    }

    currentIndex = 0;
    let result = parseExpression(str);

    if (currentIndex != str.length) {
        throw new ParseError("Error:" + printError(str, currentIndex));
    }

    return result;
}

const unarOeration = ["negate"];
const binOeration = ["+", "-", "*", "/"];
const multiOperation = ["arith-mean", "geom-mean", "harm-mean"];
const variable = ["x", "y", "z"];
const separator = ["(", ")"];

function parseExpression(str) {
    while (currentIndex < str.length) {

        skipWhitespace(str);
        let token = readToken(str);
        let result;

        skipWhitespace(str);

        if (token === "(") {
            result = parseOperation(str);
            skipWhitespace(str);
            let nextToken = readToken(str);
            if (nextToken !== ")") {
                throw new ParseError("Incorrect operator call: " + printError(str, currentIndex));
            }
        } else if (variable.includes(token)) {
            result = new Variable(token);
        } else if (isConst(token)) {
            result = new Const(parseInt(token));
        } else if (token === ")") {
            result = token;
        } else {
            throw new ParseError("Incorrect expression - unknown symbol: " + token + printError(str, currentIndex));
        }

        return result;
    }
}

function readToken(str) {
    let start = currentIndex;
    while (str[currentIndex] != " " && currentIndex < str.length && !(separator.includes(str[currentIndex]))) {
        currentIndex++;
    }
    if (start === currentIndex && separator.includes(str[currentIndex])) {
        currentIndex++;
    }
    return str.slice(start, currentIndex);
}

function parseOperation(str) {
    let operation = readToken(str);
    if (unarOeration.includes(operation)) {
        return parseUnarn(str, operation);
    } else if (binOeration.includes(operation)) {
        return parseBin(str, operation);
    } else if (multiOperation.includes(operation)) {
        return parseMulti(str, operation);
    } else {
        throw new ParseError("Unknown operation: " + operation + printError(str, currentIndex))
    }
}

function parseUnarn(str) {
    let arg = parseExpression(str);
    return new Negate(arg);
}

function parseBin(str, op) {
    let first = parseExpression(str);
    let second = parseExpression(str);
    if (first === undefined || second === undefined) {
        throw new ParseError("No argument" + printError(str, currentIndex));
    }

    switch (op) {
        case '+':
            return new Add(first, second);
        case '-':
            return new Subtract(first, second);
        case '*':
            return new Multiply(first, second);
        case '/':
            return new Divide(first, second);
        default:
            throw new ParseError("Incorrect operation: " + op + printError(str, currentIndex));
    }
}

function parseMulti(str, op) {
    let multiArguments = [];
    let arg;
    while (true) {
        let nowInd = currentIndex;
        arg = parseExpression(str);
        if (arg === ")") {
            currentIndex = nowInd;
            break;
        }

        if (arg === undefined) {
            throw new ParseError("In expression not ):" + printError(str, currentIndex));
        }
        multiArguments.push(arg);
    }

    switch (op) {
        case 'arith-mean':
            return new ArithMean(...multiArguments);
        case 'geom-mean':
            return new GeomMean(...multiArguments);
        default:
            return new HarmMean(...multiArguments);
    }
}

function isConst(string) {
    let cnst = true;
    if (string[0] == '-' || isDigit(string[0])) {
        for (let i = 1; i < string.length; i++) {
            if (!isDigit(string[i])) {
                cnst = false;
                break;
            }
        }
    } else {
        cnst = false;
    }
    return cnst;
}

function isDigit(ch) {
    return '0' <= ch && ch <= '9';
}

let whitespace = [" ", "\n", "\r", "\t"];

function skipWhitespace(string) {
    let skip = false;
    while (whitespace.includes(string[currentIndex]) && currentIndex < string.length) {
        skip = true;
        currentIndex++;
    }
}

function printError(string, pos) {
    let error = "\n";
    let location = "";

    if (pos == -1) {
        location += "^ ";
        error += string;
    } else {
        error += string.slice(0, pos);
        for (let i = 0; i < pos - 1; i++) {
            location += " ";
        }
        location += "^ ";
        error += string.slice(pos);
    }
    error += "\n";
    error += location;

    return error;
}
