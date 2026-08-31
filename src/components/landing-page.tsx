"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  DiscordIcon,
  GoogleIcon,
  InstagramIcon,
  Notion01Icon,
  YoutubeIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import config from "@/config"

gsap.registerPlugin(ScrollTrigger)

const stories = [
  {
    title: "Drop in the video",
    copy: "Drop in a public social-video link and let Relay fetch the source for processing.",
    image: "https://picsum.photos/seed/relay-signal/1200/900",
  },
  {
    title: "Build the right understanding",
    copy: "Relay detects the category and uses an existing specialist agent or creates one for the new category.",
    image: "https://picsum.photos/seed/relay-shape/1200/900",
  },
  {
    title: "Publish the finished page",
    copy: "Send the finished Markdown to Notion, Google, Discord, or another connected destination.",
    image: "https://picsum.photos/seed/relay-control/1200/900",
  },
]

const marquee = [
  { name: "Instagram", icon: InstagramIcon },
  { name: "YouTube", icon: YoutubeIcon },
  { name: "Notion", icon: Notion01Icon },
  { name: "Google", icon: GoogleIcon },
  { name: "Discord", icon: DiscordIcon },
]

export function LandingPage() {
  const pageRef = useRef<HTMLElement>(null)
  const storyRef = useRef<HTMLElement>(null)
  const [activeStory, setActiveStory] = useState(0)

  useGSAP(() => {
    const context = gsap.context(() => {
      gsap.from("[data-nav]", {
        opacity: 0,
        y: -18,
        duration: 0.8,
        ease: "power3.out",
      })
      gsap.from("[data-hero]", {
        opacity: 0,
        y: 28,
        duration: 1,
        stagger: 0.12,
        ease: "power3.out",
      })
      const motion = window.matchMedia(
        "(prefers-reduced-motion: no-preference)",
      )
      if (!motion.matches) return

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        gsap.from(element, {
          opacity: 0,
          y: 36,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            start: "top 86%",
            once: true,
          },
        })
      })

      gsap.from("[data-bento]", {
        opacity: 0,
        y: 48,
        scale: 0.97,
        duration: 0.9,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "[data-bento-wrap]",
          start: "top 78%",
          once: true,
        },
      })

      gsap.from("[data-marquee]", {
        opacity: 0,
        x: 80,
        duration: 1.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "[data-marquee]",
          start: "top 90%",
          once: true,
        },
      })

      gsap.utils.toArray<HTMLElement>("[data-story-image]").forEach((image) => {
        gsap.fromTo(
          image,
          { scale: 0.94, opacity: 0.55 },
          {
            scale: 1,
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: image,
              start: "top 84%",
              end: "bottom 24%",
              scrub: 0.65,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          },
        )
      })
      ScrollTrigger.create({
        trigger: storyRef.current,
        start: "top top+=96",
        end: "bottom bottom-=96",
        pin: "[data-story-title]",
        anticipatePin: 1,
        invalidateOnRefresh: true,
      })
    }, pageRef)
    return () => context.revert()
  }, [])

  return (
    <main
      ref={pageRef}
      className="w-full max-w-full bg-[#101311] text-[#f2f5ef]"
    >
      <nav
        data-nav
        className="fixed inset-x-0 top-5 z-20 mx-auto flex w-[min(92%,1180px)] items-center justify-between rounded-full border border-white/10 bg-[#101311]/75 px-5 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl"
      >
        <Link
          href="/"
          className="font-heading text-lg font-semibold tracking-tight"
        >
          {config.app.name}
          <span className="text-emerald-400">.</span>
        </Link>
        <div className="hidden items-center gap-7 text-sm text-white/60 md:flex">
          <a href="#system" className="transition-colors hover:text-white">
            The system
          </a>
          <a href="#workflow" className="transition-colors hover:text-white">
            How it works
          </a>
          <Link href="/privacy" className="transition-colors hover:text-white">
            Privacy
          </Link>
        </div>
        <Link
          href="/login"
          className="rounded-full bg-[#d8f27e] px-4 py-2 text-sm font-semibold text-[#101311] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8f27e]"
        >
          Sign in
        </Link>
      </nav>

      <section className="relative flex min-h-[100dvh] items-center justify-center px-6 pb-24 pt-36 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(101,133,75,0.32),transparent_35%),linear-gradient(180deg,rgba(16,19,17,0.1),#101311_88%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[58vh] bg-[url('https://picsum.photos/seed/relay-hero/1920/1080')] bg-cover bg-center opacity-25 mix-blend-luminosity contrast-125" />
        <div className="relative z-10 flex w-full max-w-6xl flex-col items-center">
          <p
            data-hero
            className="mb-8 font-mono text-xs uppercase tracking-[0.28em] text-[#d8f27e]"
          >
            Turn social video into structured knowledge
          </p>
          <h1
            data-hero
            className="w-full max-w-6xl text-balance font-heading text-[clamp(3.2rem,7vw,7.5rem)] font-semibold leading-[0.94] tracking-[-0.075em]"
          >
            Give every video a{" "}
            <span className="mx-1 inline-block h-[0.62em] w-[1.2em] rounded-full bg-[url('https://picsum.photos/seed/relay-orbit/600/400')] bg-cover bg-center align-[0.02em] shadow-[0_0_60px_rgba(216,242,126,0.22)] sm:mx-3" />{" "}
            useful second life.
          </h1>
          <p
            data-hero
            className="mt-9 max-w-xl text-pretty text-base leading-7 text-white/65 md:text-lg"
          >
            Paste an Instagram or YouTube link. Relay identifies what it is,
            assigns the right AI agent, translates the content, and publishes a
            clear Markdown result to the service you choose.
          </p>
          <div data-hero className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="rounded-full bg-[#d8f27e] px-6 py-3 text-sm font-semibold text-[#101311] transition-all hover:scale-105 hover:bg-[#e5fa9d] active:scale-95"
            >
              Process a video
            </Link>
            <a
              href="#system"
              className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-all hover:scale-105 hover:border-white/40 hover:bg-white/10 active:scale-95"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      <section id="system" className="mx-auto max-w-7xl px-6 py-36 md:py-48">
        <div
          data-reveal
          className="mb-14 flex max-w-2xl items-end justify-between gap-6"
        >
          <h2 className="font-heading text-4xl font-semibold leading-none tracking-[-0.06em] md:text-6xl">
            From a reel to something you can use.
          </h2>
          <span className="hidden h-px flex-1 bg-white/15 md:block" />
        </div>
        <div
          data-bento-wrap
          className="grid grid-flow-dense grid-cols-12 grid-rows-2 gap-3"
        >
          <article
            data-bento
            className="group relative col-span-12 row-span-2 min-h-[420px] overflow-hidden rounded-[2rem] bg-[#c8df7b] p-7 text-[#101311] md:col-span-7 md:p-10"
          >
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/relay-vault/1200/900')] bg-cover bg-center opacity-20 mix-blend-multiply transition-transform duration-700 ease-out group-hover:scale-105" />
            <div className="relative flex h-full max-w-md flex-col justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] opacity-60">
                  Extract the details
                </p>
                <h3 className="mt-24 font-heading text-4xl font-semibold leading-[0.95] tracking-[-0.06em] md:text-6xl">
                  One link. A complete, structured result.
                </h3>
              </div>
              <p className="max-w-xs text-sm leading-6 opacity-70">
                Relay can turn a recipe reel into ingredients, timings, steps, a
                summary, a guide, and a Romanized transcription with English
                translation.
              </p>
            </div>
          </article>
          <article
            data-bento
            className="group relative col-span-12 row-span-1 min-h-[240px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 md:col-span-5 md:p-8"
          >
            <div className="relative z-10">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#d8f27e]">
                Category-aware agents
              </p>
              <h3 className="mt-12 max-w-sm font-heading text-3xl font-semibold leading-none tracking-[-0.05em]">
                Let the category choose the agent.
              </h3>
            </div>
            <div className="absolute -bottom-20 -right-10 size-64 rounded-full border border-[#d8f27e]/30 transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute -bottom-12 -right-2 size-40 rounded-full border border-[#d8f27e]/20" />
          </article>
          <article
            data-bento
            className="group relative col-span-12 row-span-1 min-h-[240px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#181d19] p-7 md:col-span-5 md:p-8"
          >
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">
              Publish to your stack
            </p>
            <h3 className="mt-12 max-w-sm font-heading text-3xl font-semibold leading-none tracking-[-0.05em]">
              Publish it where your work already lives.
            </h3>
            <span className="absolute bottom-8 right-8 text-4xl text-[#d8f27e] transition-transform duration-500 group-hover:translate-x-2">
              ↗
            </span>
          </article>
        </div>
      </section>

      <div className="overflow-hidden border-y border-white/10 py-6">
        <div
          data-marquee
          className="flex w-max animate-[relay-marquee_28s_linear_infinite] gap-10 text-2xl font-medium tracking-tight text-white/30"
        >
          {[...marquee, ...marquee].map((item, index) => (
            <span
              key={`${item.name}-${index}`}
              className="flex items-center gap-10"
            >
              <HugeiconsIcon icon={item.icon} size={28} strokeWidth={1.5} />
              <span>{item.name}</span>
              <i className="size-1 rounded-full bg-[#d8f27e]" />
            </span>
          ))}
        </div>
      </div>

      <section
        id="workflow"
        ref={storyRef}
        className="mx-auto grid max-w-7xl gap-16 px-6 py-36 md:grid-cols-[0.7fr_1.3fr] md:gap-24 md:py-48"
      >
        <div data-story-title data-reveal className="self-start">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#d8f27e]">
            Work, in motion
          </p>
          <h2 className="mt-7 max-w-md font-heading text-5xl font-semibold leading-[0.92] tracking-[-0.07em] md:text-7xl">
            One link, three intelligent passes.
          </h2>
        </div>
        <div className="space-y-20" aria-label="Relay workflow">
          {stories.map((story, index) => (
            <button
              type="button"
              key={story.title}
              className="group block w-full text-left"
              onClick={() => setActiveStory(index)}
            >
              <div
                data-story-image
                className={`relative aspect-[1.35] overflow-hidden rounded-[2rem] border transition-colors duration-500 will-change-transform ${activeStory === index ? "border-[#d8f27e]/60" : "border-white/10"}`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center grayscale transition-transform duration-700 ease-out group-hover:scale-105"
                  style={{ backgroundImage: `url(${story.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#101311] via-transparent to-transparent" />
                <div className="absolute bottom-7 left-7 right-7 flex items-end justify-between gap-6">
                  <div>
                    <h3 className="font-heading text-3xl font-semibold tracking-[-0.05em]">
                      {story.title}
                    </h3>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">
                      {story.copy}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[#d8f27e]">
                    0{index + 1}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section
        data-reveal
        className="mx-6 mb-6 rounded-[2rem] bg-[#d8f27e] px-7 py-20 text-[#101311] md:px-16 md:py-28"
      >
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-12 md:flex-row md:items-end">
          <h2 className="max-w-3xl font-heading text-5xl font-semibold leading-[0.92] tracking-[-0.07em] md:text-8xl">
            Make every shared video searchable, readable, and reusable.
          </h2>
          <div className="max-w-xs">
            <p className="text-sm leading-6 opacity-70">
              Save the recipes, places, explanations, and translations hidden
              inside the videos you already share.
            </p>
            <Link
              href="/login"
              className="mt-7 inline-flex rounded-full bg-[#101311] px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-105 active:scale-95"
            >
              Process your first video ↗
            </Link>
          </div>
        </div>
      </section>

      <footer
        data-reveal
        className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-12 text-sm text-white/50 md:flex-row md:items-center md:justify-between"
      >
        <Link
          href="/"
          className="font-heading text-lg font-semibold text-white"
        >
          {config.app.name}
          <span className="text-[#d8f27e]">.</span>
        </Link>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Link href="/privacy" className="transition-colors hover:text-white">
            Privacy policy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-white">
            Terms of service
          </Link>
          <Link href="/login" className="transition-colors hover:text-white">
            Sign in
          </Link>
        </div>
        <span>Self-hosted, by design.</span>
      </footer>
    </main>
  )
}
