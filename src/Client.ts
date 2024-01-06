import { Websocket, http, os, textutils, load, peripheral, turtle, print } from "./lib/cc/main";
import { EventCallback, EventEmitter } from "./lib/EventEmitter";

export class Client {
	public ws: Websocket | undefined;
	public events = new EventEmitter();

	constructor(public uri: string = "ws://home.hri7566.info:3000") {
		this.bindEventListeners();
	}

	public on<Event extends keyof LocalEvents>(event: Event, listener: (msg: LocalEvents[Event]) => void) {
		this.events.on(event, listener as unknown as EventCallback);
	}

	public off<Event extends keyof LocalEvents>(event: Event, listener: (msg: LocalEvents[Event]) => void) {
		this.events.off(event, listener as unknown as EventCallback);
	}

	public once<Event extends keyof LocalEvents>(event: Event, listener: (msg: LocalEvents[Event]) => void) {
		this.events.once(event, listener as unknown as EventCallback);
	}

	public emit<Event extends keyof LocalEvents>(event: Event, ...args: Parameters<(msg: LocalEvents[Event]) => void>) {
		this.events.emit(event, ...args);
	}

	public connect() {
		const [ws, reason] = http.websocket(this.uri);

		if (ws !== false) {
			this.ws = ws;
			this.emit("connected", undefined);

			while (true) {
				const [worked, reason] = pcall(() => {
					if (this.ws) {
						const [good, data] = pcall(() => {
							if (!!this.ws) {
								const [data, isBinary] = this.ws.receive();
								if (!isBinary) {
									return data;
								}
							}
						});

						if (good) {
							const [success, err] = pcall(() => {
								if (data) {
									const transmission = textutils.unserializeJSON(data);

									for (const [key, msg] of pairs(transmission)) {
										if ((msg as unknown as any).m) {
											this.emit((msg as unknown as any).m, msg);
										}
									}
								}
							});

							if (!success) {
								print(err);
							}
						}
					}
				});

				if (!worked) {
					print(reason);
					print("WebSocket closed, reopening...");
					this.connect();
				}
			}
		} else {
			print("Unable to open WebSocket:", reason);
			print("WebSocket closed, reopening...");
			this.connect();
		}
	}

	protected bindEventListeners() {
		this.on("connected", () => {
			print("Connected to server");

			this.sendArray([
				{
					m: "hi",
					interface: "cc",
					label: os.computerLabel(),
					id: os.computerID()
				}
			]);

			print("Setting state...");

			const speaker = peripheral.find("speaker");

			this.sendArray([
				{
					m: "set_state",
					has_speaker: !!speaker,
					is_turtle: !!turtle
				}
			]);
		});

		this.on("log", (msg) => {
			if (msg.str) {
				print(msg.str);
			}
		});

		this.on("eval", (msg) => {
			load(msg.str)();
		});

		this.on("set_label", (msg) => {
			if (!msg.label) return;
			os.setComputerLabel(msg.label);
		});

		// this.on("audio", (msg) => {
		// 	// print("Receiving audio");
		// 	if (!msg.audio) return;
		// 	const sp = peripheral.find("speaker");
		// 	if (!!sp) {
		// 		// print(msg.audio[0]);
		// 		(sp as any).playAudio(msg.audio, 1);
		// 	} else {
		// 		// print("no speaker");
		// 	}
		// });
	}

	public sendArray<Event extends keyof ClientEvents>(arr: ClientEvents[Event][]) {
		this.ws?.send(textutils.serializeJSON(arr));
	}
}

export interface ClientState {
	has_speaker: boolean;
	is_turtle: boolean;
}

export interface ClientEvents {
	hi: {
		m: "hi";
		interface: "cc";
		label: string | undefined;
		id: number | undefined;
	};

	log: {
		m: "log";
		str: string;
	};

	set_state: {
		m: "set_state";
	} & Partial<ClientState>;
}

export interface ServerEvents {
	hi: {
		m: "hi";
	};

	log: {
		m: "log";
		str: string;
	};

	eval: {
		m: "eval";
		str: string;
	};

	set_label: {
		m: "set_label";
		label: string;
	};

	audio: {
		m: "audio";
		audio: number[];
	};
}

export type LocalEvents = ServerEvents & {
	connected: undefined;
};
