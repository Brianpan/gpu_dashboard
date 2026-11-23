import { loadDataset } from "./data.js";
import { onChange } from "./state.js";
import { render } from "./view.js";

const root = document.getElementById("app")!;

loadDataset().then((ds) => {
  render(root, ds);
  onChange(() => render(root, ds));
});
