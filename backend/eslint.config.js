import ts from "typescript-eslint";
export default ts.config(...ts.configs.recommended, {
  ignores: ["dist/**"],
  rules: { "@typescript-eslint/no-explicit-any": "error" }
});
