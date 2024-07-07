// import {registerReplace} from "src/replace/abProcessor"

declare global {
  var list_replace: ABReplaceProcessor[];
  var list_option: Map<string,string>;

  // Although regex matching is allowed, a name must be provided to indicate which rule is being used
  function registerRepladce(processor: ABReplaceProcessor):void;

  interface ABReplaceProcessor {
    id: string;
    name: string;
    is_render: boolean;
    (el: HTMLDivElement, header: string, content: string): HTMLElement | null;
  }

  /// This TypeScript decorator. If it cannot be used, configure it accordingly
  /// Modify list_replace and list_option through generators
  function register_abReplace(): register_abReplace2;
  interface register_abReplace2 {
    (target: ABReplaceProcessor3): void;
  }
  interface ABReplaceProcessor3 {
    id: string;
    name: string;
    is_render: boolean;
    process(el: HTMLDivElement, header: string, content: string): HTMLElement | null;
  }
  type ABReplaceProcessor2 = (el: HTMLDivElement, header: string, content: string) => HTMLElement | null;
}

// Add recommended code selectors

// Add recommended list selectors
