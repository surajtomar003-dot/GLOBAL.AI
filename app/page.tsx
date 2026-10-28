import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos } = await supabase.from("todos").select();

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Global.ai — Supabase Integration</h1>
      <p>Data from &apos;todos&apos; table:</p>
      {(!todos || todos.length === 0) ? (
        <p style={{ color: "#8B98A7" }}>No todos found or table is empty.</p>
      ) : (
        <ul>
          {todos.map((todo) => (
            <li key={todo.id}>{todo.name}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
