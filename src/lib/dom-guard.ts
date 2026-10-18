// Bug 3 of 18 Oct 2026: "Could not save" although the save had worked.
//
// The phone's network log showed every save reaching the database and succeeding; the console
// showed React failing with "NotFoundError: Failed to execute 'removeChild' on 'Node'" right
// after the refresh that follows a save. Chrome's page translation was on: it replaces the
// app's text nodes with its own <font> elements, and React then tries to remove nodes that are
// no longer where it left them. The app's error screen took over, and a second try "worked".
//
// Two layers:
// 1. <html translate="no"> and <meta name="google" content="notranslate"> (in __root.tsx):
//    the app has its own Czech/English switch, so Chrome no longer translates it.
// 2. This guard, for other tools that rewrite the page (other translators, extensions): a
//    remove or insert whose node has moved is skipped instead of crashing the whole page.
//    The well-known workaround from facebook/react#11538.

let installed = false;

export function installDomGuard() {
  if (installed || typeof Node === "undefined" || typeof window === "undefined") return;
  installed = true;
  const proto = Node.prototype as Node & {
    removeChild: <T extends Node>(child: T) => T;
    insertBefore: <T extends Node>(node: T, ref: Node | null) => T;
  };
  const originalRemove = proto.removeChild;
  proto.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      console.warn("[dom-guard] skipped removing a node another tool moved", child);
      return child;
    }
    return originalRemove.call(this, child) as T;
  };
  const originalInsert = proto.insertBefore;
  proto.insertBefore = function <T extends Node>(this: Node, node: T, ref: Node | null): T {
    if (ref && ref.parentNode !== this) {
      console.warn("[dom-guard] inserted at the end: reference node was moved", ref);
      return originalInsert.call(this, node, null) as T;
    }
    return originalInsert.call(this, node, ref) as T;
  };
}
