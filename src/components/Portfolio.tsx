import { motion } from "framer-motion";

const SAMPLES = [
  { id: 1, url: "https://storage.googleapis.com/static.mira.ai/agent_attachments/2f9281a4-9467-4022-959c-36458564f14e/0.png", title: "BGMI 4.2 Update Explore" },
  { id: 2, url: "https://storage.googleapis.com/static.mira.ai/agent_attachments/9313410f-7140-4965-985f-86187900b343/0.png", title: "BGMI Live with XONN" },
  { id: 3, url: "https://storage.googleapis.com/static.mira.ai/agent_attachments/88167664-964a-4122-b25c-433010f34043/0.png", title: "Battlegrounds Mobile India" },
  { id: 4, url: "https://storage.googleapis.com/static.mira.ai/agent_attachments/6446e507-6799-4c07-9556-32432851084b/0.png", title: "Moody is Live - BGMI" },
  { id: 5, url: "https://storage.googleapis.com/static.mira.ai/agent_attachments/86c67311-6415-418c-9896-0335e98f090d/0.png", title: "Royal Pass Giveaway" },
  { id: 6, url: "https://storage.googleapis.com/static.mira.ai/agent_attachments/0398642a-9e67-463e-953e-55c659695029/0.png", title: "Valorant Live Stream" },
];

export default function Portfolio() {
  return (
    <section id="portfolio" className="py-24 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">
            OUR <span className="text-parrot">WORK.</span>
          </h2>
          <p className="text-white/60">Visuals that demand attention and force the click.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SAMPLES.map((sample, index) => (
            <motion.div
              key={sample.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative aspect-video min-h-[200px] rounded-2xl overflow-hidden border border-white/10 bg-zinc-900"
            >
              <img
                src={sample.url}
                alt={sample.title}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                <span className="text-lg font-bold text-parrot">{sample.title}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
