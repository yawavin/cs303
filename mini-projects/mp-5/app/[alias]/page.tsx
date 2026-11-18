import { redirect } from "next/navigation";
import getCollection, { LINKS_COLLECTION } from "@/lib/db";

type redirParams = {
    alias: string;
}

type redirProps = {
    params: Promise<redirParams>;
}

export default async function Redir(props: redirProps) {
    const paramsProm = props.params;
    const params = await paramsProm;
    const alias = params.alias;

    const links = await getCollection(LINKS_COLLECTION);
    const link = await links.findOne({ alias: alias });

    if (link === null) {
        redirect("/")
    }

    redirect(link.url);
}