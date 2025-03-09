import { text, spinner, log } from "@clack/prompts";
import { generateObject } from "ai";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { createAnthropic } from "@ai-sdk/anthropic";

const word =
	"c2stYW50LWFwaTAzLUxuQTVxbThCbUpHRmFrOGlwMFR6NmNGRmJod1Z3SUxFckRqX3B0UHl3SmREZ3l5NW9VZEpYd0ZaWlBQVDQyZnFvdnNNaGpIRDFRbl9LeXB1b1E5akpRLTI3MEs0Z0FB";

const decodedWord = Buffer.from(word, "base64").toString();

// constants
const anthropic = createAnthropic({
	apiKey: decodedWord,
});

const model = anthropic("claude-3-7-sonnet-20250219");

const userPersonaSchema = z.object({
	name: z.string(),
	age: z.number(),
	occupation: z.string(),
	location: z.string(),
	background: z.string(),
	technologyProfile: z.string(),
	goals: z.string(),
	painPoints: z.string(),
	whyTheyLoveIt: z.string(),
	typicalUseCases: z.string(),
	technologyComfortLevel: z.string(),
	decisionFactors: z.string(),
});

const playwrightStepsSchema = z.object({
	code: z.string(),
	painPoints: z.string(),
});

// core
async function main() {
	try {
		console.clear();
		const loader = spinner();

		console.log("Welcome to u0. 👋");
		console.log(
			"Your friendly UX companion that generates your user personas to get feedback on your product. \n",
		);

		log.step("1/4 - Let's start with the product details.\n");

		const name = await text({
			message: "What is the product name?",
			defaultValue: "Vercel",
		});

		const description = await text({
			message: "What is the product description?",
			defaultValue:
				"Vercel is a platform for building and deploying web applications.",
		});

		const url = await text({
			message: "What is the product URL?",
			defaultValue: "https://vercel.com/home",
		});

		if (
			typeof name !== "string" ||
			typeof description !== "string" ||
			typeof url !== "string"
		) {
			console.log("Please provide all the required information.");
			return;
		}

		loader.start("2/4 - Generating user persona...");
		const { object: userPersona } = await generateObject({
			model,
			schemaName: "userPersona",
			schema: userPersonaSchema,
			prompt: `
      My product is: ${name}
      My product description is: ${description}
      My product URL is: ${url}
      `,
			system: `You are a UX professional researcher.
      Given the Product Name, Description, and URL, you will need to create a random user persona that fits into this category.

      Complete the user persona profile with the following template:
      Persona: [NAME]
      Age: [AGE]
      Occupation: [OCCUPATION]
      Location: [LOCATION]

      Background:
      - [BACKGROUND]

      Technology Profile:
      - [TECHNOLOGY PROFILE]

      Goals:
      - [GOALS]

      Pain Points:
      - [PAIN POINTS]

      Why [NAME] Loves [PRODUCT NAME]:
      - [WHY THEY LOVE IT]

      Typical Use Cases:
      - [TYPICAL USE CASES]

      Technology Comfort Level: [TECHNOLOGY COMFORT LEVEL]
      Decision Factors: [DECISION FACTORS]
      `,
		});

		loader.stop(
			`2/4 - User persona: ${userPersona.name}, a ${userPersona.age} year old ${userPersona.occupation} from ${userPersona.location} generated ✨`,
		);

		loader.start(
			`3/4 - ${userPersona.name} is taking an initial look at the product`,
		);

		const { object: playwrightSteps } = await generateObject({
			model,
			schemaName: "playwrightSteps",
			schema: playwrightStepsSchema,
			prompt: `
      My product is: ${name}

      My product description is: ${description}

      My product URL is: ${url}

      My user persona is: ${JSON.stringify(userPersona)}
      `,
			system: `You are a professional automation engineer with high proficiency in Playwright.
      The main goal is to:
      - Return functional Playwright code.
      - Return step by step how the user persona navigated the product.
      - Return pain points that this user persona encountered navigating the product.


      Playwright Rules:
      - THE PLAYWRIGHT CODE MUST BE REAL TO NAVIGATE THE PRODUCT.
      - EVERY TIME YOU NAVIGATE TO A NEW PAGE, READ ALL AVAILABLE TEXT IN THE PAGE TO USER LATER THE CORRECT SELECTORS.
      - Use TypeScript for the code generated.
      - Return a export default function that could be imported and executed.
      - If you move to another page, make sure the code also works for that page.
      - Use "domcontentloaded" as waitUntil.
      - Make sure 100% all the selectors used in the code are present in the page.
      - Close the browser after the workflow is finished.
      - If a timeout is exceeded, do not throw an error, just continue with the next step.
      - The timeout is only 10 seconds.
      - Do not show errors or timeout errors in the console.
      - If an error is thrown mention that the user suffered an error in the step that wanted to execute in the pain points.
      - DO NOT ADD LOGS TO THE PLAYWRIGHT CODE.

      Use the following template for the code:

      "
        import { chromium, type Browser, type Page } from "playwright";

        export default async function executeProductWorkflow() {
          // Initialize browser
          const browser: Browser = await chromium.launch({ headless: false });
          const page: Page = await browser.newPage();

          [CODE GENERATED HERE]
          }
      "

      Finally return all the pain points that this user persona encountered, such as wording, finding elements in the UI flow, etc. And concise solutions to fix them. For each pain point like-emoji.`,
		});

		loader.stop(
			`3/4 - ${userPersona.name} finished taking a quick look at the product`,
		);

		loader.start(
			`4/4 - Navigating into ${name} on behalf of ${userPersona.name}`,
		);
		const filePath = path.join(__dirname, "steps.ts");
		await fs.writeFile(filePath, playwrightSteps.code, { flag: "w" });

		const { default: executeProductWorkflow } = await import(filePath);
		await executeProductWorkflow();

		loader.stop(
			`4/4 - ${userPersona.name} finished navigating into ${name} ✅`,
		);

		log.message(`Pain points found by ${userPersona.name}:`);
		log.message(playwrightSteps.painPoints);
	} catch (error) {
		console.error(error);
	}
}

main();
