"use client"

import { useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

export function ScrollAnimations() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    // Hero Parallax Effect
    // Move the video background slightly slower than scroll
    gsap.to(".hero-video", {
      yPercent: 30,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero-section",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    })

    // Move hero content faster than scroll (upwards)
    gsap.to(".hero-content", {
      y: -100,
      opacity: 0,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero-section",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    })

    // Animate Feature Cards
    const cards = document.querySelectorAll(".feature-card")
    cards.forEach((card, index) => {
      gsap.fromTo(
        card,
        {
          opacity: 0,
          y: 100,
          rotateX: 10,
          scale: 0.9,
        },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          scale: 1,
          duration: 1,
          ease: "power3.out",
          delay: index * 0.15,
          scrollTrigger: {
            trigger: card,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        }
      )
    })

    // Animate Steps with horizontal slide
    const steps = document.querySelectorAll(".step-item")
    steps.forEach((step, index) => {
      gsap.fromTo(
        step,
        {
          opacity: 0,
          x: index % 2 === 0 ? -100 : 100,
        },
        {
          opacity: 1,
          x: 0,
          duration: 1,
          ease: "power4.out",
          scrollTrigger: {
            trigger: step,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      )
    })

    // Animate Tech Stack (staggered reveal)
    const techItems = document.querySelectorAll(".tech-stack-container > div")
    gsap.fromTo(
      techItems,
      {
        opacity: 0,
        y: 20,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        scrollTrigger: {
          trigger: ".tech-stack-container",
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      }
    )

    // Animate CTA
    gsap.fromTo(
      ".cta-card",
      {
        opacity: 0,
        scale: 0.8,
        y: 100,
      },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 1.2,
        ease: "elastic.out(1, 0.75)",
        scrollTrigger: {
          trigger: ".cta-card",
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      }
    )

    // Text Reveal Effect for Headings
    const headings = document.querySelectorAll("h2.font-heading")
    headings.forEach((heading) => {
      gsap.fromTo(
        heading,
        {
          opacity: 0,
          y: 30,
          clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0% 100%)",
        },
        {
          opacity: 1,
          y: 0,
          clipPath: "polygon(0 0%, 100% 0%, 100% 100%, 0% 100%)",
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: heading,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        }
      )
    })

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return null
}
