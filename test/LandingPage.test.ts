import { it } from "vitest";
import { render, fireEvent, screen } from "@testing-library/vue";
import HelloWorld from "../src/components/HelloWorld.vue";

it("creates a user with the correct fields", () => {
  render(HelloWorld);

  screen.getByText("Count is 0");
});
