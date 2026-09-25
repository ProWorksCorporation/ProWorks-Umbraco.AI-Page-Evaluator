/**
 * Global Vitest setup.
 *
 * happy-dom does not implement `HTMLElement.attachInternals()`, which UUI 2 form controls
 * (uui-toggle, uui-checkbox, uui-input, …) call when they render. Without it the host
 * element's render throws and Lit never completes an update. The backoffice itself ships
 * `element-internals-polyfill` (a peer dependency of @umbraco-cms/backoffice) for the same reason.
 */
import 'element-internals-polyfill';
