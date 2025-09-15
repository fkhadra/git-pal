import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import commands from "~/commands";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const [token, setToken] = useState("");
  const handleSubmit = async () => {
    try {
      await commands.authenticate(token);

      throw redirect({
        to: "/palette",
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <h2>Hello "/login"!</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button>Submit</button>
      </form>
    </div>
  );
}
