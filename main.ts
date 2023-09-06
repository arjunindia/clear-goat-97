import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";

const router = new Router();
const kv = await Deno.openKv();

router.use(async (context, next) => {
  const start = Date.now();
  await next();
  console.log(context.request.method, context.request.url.pathname, Date.now() - start, "ms");
});

router
  .get("/", (context) => {
    context.response.body = "Welcome to quiz/goal API!";
  })
  .post("/quiz", async (context) => {
    const body = context.request.body();
    if (body.type === "json") {
      const value:{
        name: string;
        email: string;
      } = await body.value;
      if (value.name && value.email) {
        // email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.email)) {
          context.response.body = "Invalid email address";
          context.response.status = 400;
          return;
        }
        const found = await kv.get(["quiz",value.email]);
        if (!found.value) {
          await kv.set(["quiz",value.email], value.name);
          context.response.body = "user added.";
        } else {
          context.response.body = "user already exists";
          context.response.status = 400;
        }
      } else {
        context.response.body = "Invalid user. data must be {name: string, email: string}";
        context.response.status = 400;
      }
    } else {
      context.response.body = "Invalid request. data must be json. Make sure to set Content-Type header to application/json";
      context.response.status = 400;
    }
  })
  .get("/quiz/:email", async (context) => {
    const email = context.params.email;
    if (email) {
      const found = await kv.get(["quiz",email]);
      if (found.value) {
        context.response.body = found.value;
      } else {
        context.response.body = "user not found";
        context.response.status = 404;
      }
    } else {
      context.response.body = "Invalid request. email is required";
      context.response.status = 400;
    }
  })
  .delete("/quiz/:email", async (context) => {
    const email = context.params.email;
    if (email) {
      const found = await kv.get(["quiz",email]);
      if (found.value) {
        await kv.delete(["quiz",email]);
        context.response.body = "user deleted";
      } else {
        context.response.body = "user not found";
        context.response.status = 404;
      }
    } else {
      context.response.body = "Invalid request. email is required";
      context.response.status = 400;
    }
  })
  .get("/quiz", async (context) => {
    const list = kv.list({prefix:["quiz"]});
    const users = [];
    for await (const {key, value} of list) {
      users.push({email: key[1], name: value});
    context.response.body = users;
    }
  })
  .post("/goal", async (context) => {
    const body = context.request.body();
    if (body.type === "json") {
      const value:{
        name: string;
        institution: string;
        location: string;
        email: string;
      } = await body.value;
      if (value.name && value.institution && value.location && value.email) {
        // email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.email)) {
          context.response.body = "Invalid email address";
          context.response.status = 400;
          return;
        }
        const found = await kv.get(["goal",value.email]);
        if (!found.value) {
          await kv.set(["goal",value.email], {name: value.name, institution: value.institution, location: value.location});
          context.response.body = "user added.";
        } else {
          context.response.body = "user already exists";
          context.response.status = 400;
        }
      }
    } else {
      context.response.body = "Invalid request. data must be json. Make sure to set Content-Type header to application/json";
      context.response.status = 400;
    }
  })
  .get("/goal/:email", async (context) => {
    const email = context.params.email;
    if (email) {
      const found = await kv.get(["goal",email]);
      if (found.value) {
        context.response.body = found.value;
      } else {
        context.response.body = "user not found";
        context.response.status = 404;
      }
    } else {
      context.response.body = "Invalid request. email is required";
      context.response.status = 400;
    }
  })
  .delete("/goal/:email", async (context) => {
    const email = context.params.email;
    if (email) {
      const found = await kv.get(["goal",email]);
      if (found.value) {
        await kv.delete(["goal",email]);
        context.response.body = "user deleted";
      } else {
        context.response.body = "user not found";
        context.response.status = 404;
      }
    } else {
      context.response.body = "Invalid request. email is required";
      context.response.status = 400;
    }
  })
  .get("/goal", async (context) => {
    const list = kv.list<{
      name: string;
      institution: string;
      location: string;
    }>({prefix:["goal"]});
    const users = [];
    for await (const {key, value} of list) {
      users.push({email: key[1], name: value.name, institution: value.institution, location: value.location});
    context.response.body = users;
    }
  });

const app = new Application();
app.use(oakCors()); // Enable CORS for All Routes
app.use(router.routes());
app.use(router.allowedMethods());
app.addEventListener("listen", () => {
  console.log("Listening on port 8000\nhttp://127.0.0.1:8000");
});
app.addEventListener("error", (evt) => {
  console.log(evt.error);
});
app.addEventListener("close", () => {
  console.log("Closing...");
  kv.close();
});

await app.listen({ port: 8000 });
