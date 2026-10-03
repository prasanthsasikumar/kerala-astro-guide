import { h } from "../lib/dom.js";
import { t, tx } from "../lib/i18n.js";
import { listCharts, deleteChart, exportBackup, importBackup } from "../lib/store.js";

export function render(el) {
  const list = h("div");
  const draw = () => {
    const charts = listCharts();
    list.replaceChildren(charts.length === 0 ? h("div.empty", t("noSaved")) :
      h("div.table-wrap", h("table.data",
        h("thead", h("tr", h("th", t("name")), h("th", t("date")), h("th", t("time")), h("th", t("place")), h("th", ""))),
        h("tbody", charts.map((c) => h("tr",
          h("td", h("a", { href: `#/horoscope?id=${c.id}` }, c.name || "—")),
          h("td.num", c.date), h("td.num", c.time), h("td", c.place?.name || ""),
          h("td.r", h("button.btn.btn-sm.btn-ghost", { onclick: () => { if (confirm(tx("നീക്കം ചെയ്യട്ടെ?", "Delete this chart?"))) { deleteChart(c.id); draw(); } } }, t("delete")))))))));
  };
  draw();
  const file = h("input", { type: "file", accept: "application/json", hidden: true, onchange: async () => {
    try { importBackup(await file.files[0].text()); draw(); } catch (e) { alert(e.message); }
    file.value = "";
  } });
  el.append(
    h("div.page-head", h("h1", t("saved")),
      h("div.form-actions.no-print", { style: { margin: 0 } },
        h("button.btn", { onclick: () => {
          const a = h("a", { href: URL.createObjectURL(new Blob([exportBackup()], { type: "application/json" })), download: `astro-guide-backup-${new Date().toISOString().slice(0, 10)}.json` });
          a.click(); URL.revokeObjectURL(a.href);
        } }, t("backup")),
        h("button.btn", { onclick: () => file.click() }, t("restore")), file)),
    list);
}
