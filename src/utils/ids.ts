import { v4 as uuidv4 } from "uuid";

export function id(prefix: string) {
    return `${prefix}_${uuidv4()}`;
}
