// Local review server; only the example HTML and generated JavaScript are served.
Deno.serve({ hostname: "127.0.0.1", port: 4192 }, async (request) => {
  const url = new URL(request.url);
  const path = url.pathname === "/"
    ? "examples/index.html"
    : /^\/[A-Za-z0-9_-]+\.js$/.test(url.pathname)
    ? `dist${url.pathname}`
    : undefined;
  if (!path) return new Response("Not found", { status: 404 });
  try {
    return new Response(await Deno.readFile(path), {
      headers: {
        "content-type": path.endsWith("html")
          ? "text/html; charset=utf-8"
          : "text/javascript; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return new Response("Not found", { status: 404 });
    }
    throw error;
  }
});
