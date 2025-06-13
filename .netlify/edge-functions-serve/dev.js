import { boot } from "https://v2-12-0--edge.netlify.com/bootstrap/index-combined.ts";

const functions = {}; const metadata = { functions: {} };


      try {
        const { default: func } = await import("file:///Users/jneumann/Repos/synapse/netlify/edge-functions/image.ts");

        if (typeof func === "function") {
          functions["image"] = func;
          metadata.functions["image"] = {"url":"file:///Users/jneumann/Repos/synapse/netlify/edge-functions/image.ts"}
        } else {
          console.log("\u001b[91m⬥\u001b[39m \u001b[31mFailed\u001b[39m to load Edge Function \u001b[33mimage\u001b[39m. The file does not seem to have a function as the default export.");
        }
      } catch (error) {
        console.log("\u001b[91m⬥\u001b[39m \u001b[31mFailed\u001b[39m to run Edge Function \u001b[33mimage\u001b[39m:");
        console.error(error);
      }
      


      try {
        const { default: func } = await import("file:///Users/jneumann/Repos/synapse/netlify/edge-functions/preview.ts");

        if (typeof func === "function") {
          functions["preview"] = func;
          metadata.functions["preview"] = {"url":"file:///Users/jneumann/Repos/synapse/netlify/edge-functions/preview.ts"}
        } else {
          console.log("\u001b[91m⬥\u001b[39m \u001b[31mFailed\u001b[39m to load Edge Function \u001b[33mpreview\u001b[39m. The file does not seem to have a function as the default export.");
        }
      } catch (error) {
        console.log("\u001b[91m⬥\u001b[39m \u001b[31mFailed\u001b[39m to run Edge Function \u001b[33mpreview\u001b[39m:");
        console.error(error);
      }
      

boot(functions, metadata);