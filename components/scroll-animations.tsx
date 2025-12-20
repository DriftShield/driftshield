"use client"

import { useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

export function ScrollAnimations() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    // Animate Feature Cards
    const cards = document.querySelectorAll(".feature-card")
    cards.forEach((card, index) => {
      gsap.fromTo(
        card,
        {
          opacity: 0,
          y: 50,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: index * 0.2,
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      )
    })

    // Animate Steps
    const steps = document.querySelectorAll(".step-item")
    steps.forEach((step, index) => {
      gsap.fromTo(
        step,
        {
          opacity: 0,
          x: index % 2 === 0 ? -50 : 50,
        },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          scrollTrigger: {
            trigger: step,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        }
      )
    })

    // Animate Tech Stack
    gsap.fromTo(
      ".tech-stack-container",
      {
        opacity: 0,
        scale: 0.9,
      },
      {
        opacity: 1,
        scale: 1,
        duration: 1,
        scrollTrigger: {
          trigger: ".tech-stack-container",
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      }
    )

    // Animate CTA
    gsap.fromTo(
      ".cta-card",
      {
        opacity: 0,
        y: 100,
      },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".cta-card",
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      }
    )

    // Cleanup
    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return null
}

