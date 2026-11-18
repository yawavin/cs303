import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { MongoServerError } from "mongodb";
import getCollection, { LINKS_COLLECTION } from "@/lib/db";

function isValidUrl(value: string): boolean {

  try {
    const url = new URL(value);
    if (url.protocol == "http:" || url.protocol == "https:") {
        return true;
    }
    return false;

  } catch (e) {
    return false;
  }

}

function isAlias(value: string): boolean {
    const validChars = /^[A-Za-z0-9_-]{1,32}$/.test(value);
    return validChars;
}

async function shorten(formData: FormData) {
    "use server";

    const rUrl = formData.get("url");
    const rAlias = formData.get("alias");

    let url = '';
    let alias = '';

    if (typeof rUrl === 'string') {
        url = rUrl.trim();
    }

    if (typeof rAlias === 'string') {
        alias = rAlias.trim();
    }


    if (!isValidUrl(url)) {
        redirect("/?error=url");
    }

    if (!isAlias(alias)) {
        redirect("/?error=alias");
    }

    const links = await getCollection(LINKS_COLLECTION);
    await links.createIndex({alias: 1}, {unique: true});

    let aliasUnavail = false;

    try {
        await links.insertOne({alias: alias, url: url});
    } catch (e) {
        if (e instanceof MongoServerError && e.code === 11000) {
            aliasUnavail = true;
        }
        else {
            throw e;
        }
    }

    if (aliasUnavail) {
        redirect("/?error=unavailable");
    }

    redirect("/?alias=" + alias)

}

type Params = {
    alias: string | undefined;
    error: string | undefined;
};

type HomeProps = {
    searchParams: Promise<Params>;
}

export default async function Home(props: HomeProps) {
  const paramsProm = props.searchParams;
  const params = await paramsProm;

  const alias = params.alias;
  const error = params.error;


  let shortenedUrl = "";
  if (alias !== undefined) {

      const header = await headers();

      let p = header.get("x-forwarded-proto");
      if (p == null) {
          p = "http";
      }

  const name = header.get("host");
  shortenedUrl = p + "://" + name + "/" + alias;

  }

  let errorMsg = "";
  if (error === "url") {
      errorMsg = "Please enter a valid URL.";
  } else if (error === "alias") {
      errorMsg = "Please enter a valid alias.";
  } else if (error === "unavailable") {
      errorMsg = "That alias is not available. Please try another one.";
  }


  return (
    <>
        <div className="min-h-screen bg-green-50">
            <main className="bg-green-50 mx-auto mt-24 w-1/2 px-8">
                <div className="mb-16">
                    <h1 className="mb-4 text-5xl font-semibold">URL Shortener</h1>
                </div>

                <form action={shorten} className="space-y-10 rounded-3xl border-2 border-gray-200 bg-white p-12 shadow-sm">
                    <div className="mb-16">
                        <label>URL:</label>
                        <input name="url" type="url"
                               className="w-full rounded-lg border border-gray-300 bg-gray-50 px-6 py-4 text-gray-900" required />
                        <label>Alias:</label>
                        <input name="alias"
                               className="w-full rounded-lg border border-gray-300 bg-gray-50 px-6 py-4 text-gray-900" required />
                        <br/>
                        <br/>
                        <button type="submit" className="rounded-lg bg-green-800 px-3 py-2 font-medium text-white shadow-sm">Submit</button>
                    </div>


                </form>
                {errorMsg !== ("") ?
                (
                <p className="text-center text-red-800">Error: {errorMsg}</p>
                ) : null}

                {shortenedUrl !== ("") ?
                    (
                        <a href={shortenedUrl}><p className="text-center text-green-950 font-bold">Success! Shortened URL: {shortenedUrl}</p></a>
                    ) : null}

            </main>
        </div>
    </>
  );
}
