import "./style.css";
import { render } from "@builder.io/qwik";
import { App } from "./app";

render(document.getElementById("app") as HTMLElement, <App />);
