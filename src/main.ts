import { Client } from "./Client";
import { peripheral } from "./lib/cc/main"
print("hello!")
const speakers: any[] = [];
const modem = peripheral.find("modem");
for (const [i, v] of pairs((modem as any).getNamesRemote())) {
    (table as any).insert(speakers, peripheral.wrap(v))
}
const client = new Client()
client.on("audio", (msg) => {
    for (const [k,v] of pairs(speakers)) {
        v.playAudio(msg.audio);
    }
})
client.connect();
