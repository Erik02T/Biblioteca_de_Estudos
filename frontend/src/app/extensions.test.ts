import { editorExtensions } from "./extensions";
import { ToggleBlock, Callout } from "./editor-blocks";

interface AttributeConfig {
  default?: unknown;
  parseHTML?: (el: { getAttribute: (name: string) => string | null; querySelector?: (selector: string) => { textContent: string } | null; className?: string }) => unknown;
}

interface ParseRuleConfig {
  tag: string;
}

describe("editorExtensions", () => {
  it("registers task list extensions for checklist support", () => {
    const names = editorExtensions.map((extension) => extension.name).filter(Boolean);

    expect(names).toEqual(expect.arrayContaining(["taskList", "taskItem"]));
  });

  it("registers toggle and callout blocks for F5 personalization", () => {
    const names = editorExtensions.map((extension) => extension.name).filter(Boolean);

    expect(names).toEqual(expect.arrayContaining(["toggleBlock", "callout"]));
  });

  it("configures ToggleBlock attributes and HTML parsing correctly", () => {
    expect(ToggleBlock.name).toBe("toggleBlock");
    const addAttributes = ToggleBlock.config.addAttributes;
    expect(addAttributes).toBeDefined();
    const attrs = (addAttributes ? addAttributes.call({} as never) : {}) as Record<string, AttributeConfig>;
    expect(attrs.open?.default).toBe(true);
    expect(attrs.summary?.default).toBe("Alternante");

    // Test summary parsing from text inside <summary>
    const mockElWithSummary = {
      getAttribute: jest.fn().mockReturnValue(null),
      querySelector: jest.fn().mockReturnValue({ textContent: "  Seção Oculta  " }),
    };
    expect(attrs.summary?.parseHTML?.(mockElWithSummary)).toBe("Seção Oculta");

    const mockElWithDataSummary = {
      getAttribute: jest.fn().mockImplementation((attr: string) => attr === "data-summary" ? "Custom Summary" : null),
      querySelector: jest.fn(),
    };
    expect(attrs.summary?.parseHTML?.(mockElWithDataSummary)).toBe("Custom Summary");
  });

  it("configures Callout attributes and HTML parsing across tags and classes", () => {
    expect(Callout.name).toBe("callout");
    const addAttributes = Callout.config.addAttributes;
    expect(addAttributes).toBeDefined();
    const attrs = (addAttributes ? addAttributes.call({} as never) : {}) as Record<string, AttributeConfig>;
    expect(attrs.variant?.default).toBe("info");

    const parseHTML = Callout.config.parseHTML;
    expect(parseHTML).toBeDefined();
    const parseRules = (parseHTML ? parseHTML.call({} as never) : []) as ParseRuleConfig[];
    const tags = parseRules.map((rule) => rule.tag);
    expect(tags).toContain('aside[data-type="callout"]');
    expect(tags).toContain('div[data-type="callout"]');
    expect(tags).toContain('aside.callout');
    expect(tags).toContain('div.callout');

    // Test variant extraction from class
    const mockDivCallout = {
      getAttribute: jest.fn().mockReturnValue(null),
      className: "callout callout-warning",
    };
    expect(attrs.variant?.parseHTML?.(mockDivCallout)).toBe("warning");

    // Test variant extraction from data-variant
    const mockAsideData = {
      getAttribute: jest.fn().mockReturnValue("danger"),
      className: "callout",
    };
    expect(attrs.variant?.parseHTML?.(mockAsideData)).toBe("danger");
  });
});
