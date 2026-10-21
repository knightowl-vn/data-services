// Importing the package loads the tokens and component styles once.
// In the portal the shell loads it; remotes share that copy at runtime.
import "./tokens.css";
import "./ui.css";

export * from "./components";
export * from "./DataTable";
