export function findScriptSrc(
  html: string,
  predicate: (src: string) => boolean,
  baseUrl: string
): string | null {
  for (const match of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
    const src = match[1];
    if (predicate(src)) {
      return new URL(src, baseUrl).toString();
    }
  }

  return null;
}

export function extractBracketedValue(
  source: string,
  openIndex: number,
  openChar: string,
  closeChar: string
): string | null {
  if (openIndex < 0 || source[openIndex] !== openChar) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let stringQuote = "";
  let escaped = false;

  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (inString) {
      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === stringQuote) {
        inString = false;
        stringQuote = "";
      }

      continue;
    }

    if (char === "\"" || char === "'") {
      inString = true;
      stringQuote = char;
      continue;
    }

    if (char === openChar) {
      depth += 1;
      continue;
    }

    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openIndex, index + 1);
      }
    }
  }

  return null;
}

export function extractAssignedArray(source: string, assignment: string): string | null {
  const assignmentIndex = source.indexOf(assignment);
  if (assignmentIndex < 0) {
    return null;
  }

  const openIndex = source.indexOf("[", assignmentIndex + assignment.length);
  return extractBracketedValue(source, openIndex, "[", "]");
}

export function extractConditionalAssignedArray(
  source: string,
  assignment: string,
  branch: "truthy" | "falsy"
): string | null {
  const assignmentIndex = source.indexOf(assignment);
  if (assignmentIndex < 0) {
    return null;
  }

  const truthyOpenIndex = source.indexOf("[", assignmentIndex + assignment.length);
  const truthyArray = extractBracketedValue(source, truthyOpenIndex, "[", "]");
  if (!truthyArray) {
    return null;
  }

  if (branch === "truthy") {
    return truthyArray;
  }

  const falsyOpenIndex = source.indexOf("[", truthyOpenIndex + truthyArray.length);
  return extractBracketedValue(source, falsyOpenIndex, "[", "]");
}

export function splitTopLevelObjects(arrayLiteral: string): string[] {
  const objects: string[] = [];
  let depth = 0;
  let inString = false;
  let stringQuote = "";
  let escaped = false;
  let objectStart = -1;

  for (let index = 0; index < arrayLiteral.length; index += 1) {
    const char = arrayLiteral[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (inString) {
      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === stringQuote) {
        inString = false;
        stringQuote = "";
      }

      continue;
    }

    if (char === "\"" || char === "'") {
      inString = true;
      stringQuote = char;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        objectStart = index;
      }
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0 && objectStart >= 0) {
        objects.push(arrayLiteral.slice(objectStart, index + 1));
        objectStart = -1;
      }
    }
  }

  return objects;
}

export function getJsStringProperty(objectLiteral: string, property: string): string | null {
  const match = objectLiteral.match(new RegExp(`${escapeRegExp(property)}:"((?:\\\\.|[^"])*)"`, "u"));
  if (!match) {
    return null;
  }

  return match[1].replace(/\\"/g, "\"");
}

export function getJsNumberProperty(objectLiteral: string, property: string): number | null {
  const match = objectLiteral.match(new RegExp(`${escapeRegExp(property)}:(-?(?:[0-9]+(?:\\.[0-9]+)?|\\.[0-9]+))`, "u"));
  if (!match) {
    return null;
  }

  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function getJsStringArrayFirst(objectLiteral: string, property: string): string | null {
  const match = objectLiteral.match(new RegExp(`${escapeRegExp(property)}:\\["((?:\\\\.|[^"])*)"\\]`, "u"));
  if (!match) {
    return null;
  }

  return match[1].replace(/\\"/g, "\"");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
