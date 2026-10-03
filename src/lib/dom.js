// Tiny DOM builder: h("div.card", {onclick}, ...children)
export function h(tag, props, ...children) {
  if (props == null || typeof props !== "object" || props instanceof Node || Array.isArray(props)) {
    children.unshift(props);
    props = {};
  }
  const [name, ...classes] = tag.split(".");
  const el = document.createElement(name || "div");
  if (classes.length) el.className = classes.join(" ");
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = [el.className, v].filter(Boolean).join(" ");
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "html") el.innerHTML = v;
    else if (k in el && typeof v !== "string") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : String(c));
  }
}

export function clear(el) {
  while (el.firstChild) el.firstChild.remove();
  return el;
}

export function table(headers, rows, { rightCols = [] } = {}) {
  return h("div.table-wrap",
    h("table.data",
      h("thead", h("tr", headers.map((x, i) => h("th", { class: rightCols.includes(i) ? "r" : "" }, x)))),
      h("tbody", rows.map((r) => h("tr", r.map((x, i) => h("td", { class: rightCols.includes(i) ? "r" : "" }, x)))))));
}

export function kv(pairs) {
  return h("dl.kv", pairs.filter(Boolean).flatMap(([k, v]) => [h("dt", k), h("dd", v)]));
}
