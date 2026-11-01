import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Alert, Button, DataTable, SelectField, TextField } from "./index";

describe("ui", () => {
  it("renders a primary button that does not submit forms by default", () => {
    const html = renderToStaticMarkup(<Button>Save</Button>);
    expect(html).toContain('type="button"');
    expect(html).toContain("ko-button--primary");
  });

  it("links a text field label, input and error", () => {
    const html = renderToStaticMarkup(<TextField id="name" label="Name" error="Required" />);
    expect(html).toContain('for="name"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="name-msg"');
    expect(html).toContain("Required");
  });

  it("accepts plain strings as select options", () => {
    const html = renderToStaticMarkup(<SelectField label="Rule" options={["a", "b"]} />);
    expect(html).toContain('<option value="a">a</option>');
  });

  it("announces danger alerts", () => {
    expect(renderToStaticMarkup(<Alert tone="danger">x</Alert>)).toContain('role="alert"');
  });

  it("shows an empty row when there is no data", () => {
    const html = renderToStaticMarkup(
      <DataTable columns={[{ key: "a", header: "A" }]} rows={[]} rowKey={() => 1} empty="None" />,
    );
    expect(html).toContain('colSpan="1"');
    expect(html).toContain("None");
  });
});
