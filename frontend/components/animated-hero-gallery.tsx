import Image from "next/image";

type AnimatedHeroGalleryProps = {
  images: Array<{
    src: string;
    alt: string;
  }>;
};

const frameClasses = [
  "left-[4%] top-[8%] w-36 rotate-[-9deg] md:w-44 hero-float-slow",
  "right-[8%] top-[4%] w-40 rotate-[7deg] md:w-52 hero-float-medium",
  "left-[18%] top-[34%] w-44 rotate-[4deg] md:w-56 hero-float-fast",
  "right-[14%] top-[38%] w-36 rotate-[-6deg] md:w-48 hero-float-slow",
  "left-[10%] bottom-[8%] w-40 rotate-[8deg] md:w-52 hero-float-medium",
  "right-[4%] bottom-[5%] w-44 rotate-[-4deg] md:w-56 hero-float-fast",
] as const;

export function AnimatedHeroGallery({ images }: AnimatedHeroGalleryProps) {
  const galleryImages = images.slice(0, frameClasses.length);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,241,230,0.96)_0%,rgba(248,241,230,0.88)_43%,rgba(248,241,230,0.22)_66%,rgba(248,241,230,0)_100%)] dark:bg-[linear-gradient(90deg,rgba(23,25,36,0.94)_0%,rgba(23,25,36,0.86)_44%,rgba(23,25,36,0.2)_68%,rgba(23,25,36,0)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2),transparent_56%)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_56%)]" />
      <div className="absolute inset-y-0 right-0 hidden w-[48%] lg:block">
        <div className="absolute inset-[6%] rounded-[2rem] bg-[linear-gradient(160deg,rgba(255,255,255,0.72),rgba(255,255,255,0.18))] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_30px_90px_-45px_rgba(95,64,26,0.5)] ring-1 ring-black/6 backdrop-blur-[2px] dark:bg-[linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] dark:ring-white/8" />
        {galleryImages.length ? (
          galleryImages.map((image, index) => (
            <div
              key={`${image.src}-${index}`}
              className={`absolute overflow-hidden rounded-[1.75rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.6))] p-2 shadow-[0_28px_90px_-35px_rgba(21,23,31,0.55)] ring-1 ring-black/7 backdrop-blur-sm dark:border-white/35 dark:bg-white/20 dark:ring-white/8 ${frameClasses[index]}`}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.2rem] bg-[#d9c2a4]/25">
                <div className="absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(15,18,25,0.14))]" />
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  unoptimized
                  className="hero-kenburns object-cover saturate-[1.06] contrast-[1.04]"
                  sizes="(min-width: 1024px) 22vw, 0px"
                />
              </div>
            </div>
          ))
        ) : (
          <>
            {frameClasses.slice(0, 4).map((frameClass, index) => (
              <div
                key={frameClass}
                className={`absolute overflow-hidden rounded-[1.75rem] border border-white/55 bg-[linear-gradient(140deg,rgba(255,255,255,0.85),rgba(255,255,255,0.28))] p-2 shadow-[0_28px_90px_-35px_rgba(21,23,31,0.55)] ring-1 ring-black/7 backdrop-blur-sm dark:border-white/30 dark:bg-[linear-gradient(140deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08))] dark:ring-white/8 ${frameClass}`}
              >
                <div className="aspect-[4/5] rounded-[1.2rem] bg-[linear-gradient(155deg,rgba(31,36,48,0.9),rgba(185,120,52,0.38),rgba(255,255,255,0.12))]" />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
