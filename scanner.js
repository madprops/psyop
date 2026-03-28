#!/usr/bin/env node

import {spawn} from "child_process"
import fs from "fs"
import yt_search from "yt-search"
import {fileURLToPath} from "url"
import {dirname} from "path"

let __filename = fileURLToPath(import.meta.url)
let __dirname = dirname(__filename)
process.chdir(__dirname)
let browser = `firefox-developer-edition`
let browser_args = [`-P`, `tile2`]

async function call_llama(prompt, temp) {
  let url = `http://172.17.0.1:8080/v1/chat/completions`
  let payload = {messages: [{role: `user`, content: prompt}], temperature: temp}

  try {
    let response = await fetch(url, {method: `POST`, headers: {"Content-Type": `application/json`}, body: JSON.stringify(payload)})
    let data = await response.json()

    if (data.choices && data.choices[0]) {
      return data.choices[0].message.content.trim()
    }

    console.log(`Unexpected API response:`, data)
    return null
  }
  catch (error) {
    console.log(`Fetch error:`, error)
    return null
  }
}

async function run_youtube_agent() {
  let data_file = fs.readFileSync(`./data.json`, `utf-8`)
  let data = JSON.parse(data_file)
  let interests = data.interests
  console.log(`Asking Llama for a search query...`)
  let query_prompt = `Based on these interests: "${interests}", generate a random 3-word search query. Output ONLY the 3 words, no quotes, no extra text, no markdown. Avoid Shorts.`
  let search_term = await call_llama(query_prompt, 0.9)

  if (!search_term) {
    console.log(`Failed to get a search term.`)
    return
  }

  let clean_search = search_term.replace(/[^a-zA-Z0-9 ]/g, ``).trim().split(` `).slice(0, 3).join(` `)
  console.log(`Searching YouTube directly for: ${clean_search}...`)
  let search_results = await yt_search(clean_search)
  let top_videos = search_results.videos.slice(0, 10)

  if (top_videos.length === 0) {
    console.log(`No videos found.`)
    return
  }

  let video_list_text = top_videos.map((v) => `ID: ${v.videoId} | Title: ${v.title}`).join(`\n`)
  console.log(`Asking Llama to pick a video from the list...`)
  let pick_prompt = `You are a web automation agent. Look at this list of videos and find one matching these interests: "${interests}". \n\n${video_list_text}\n\nReturn ONLY the exact ID (for example: dQw4w9WgXcQ) of the video to watch. Do not output any other text.`
  let target_ref = await call_llama(pick_prompt, 0.1)

  if (target_ref) {
    let clean_id = target_ref.replace(/[^a-zA-Z0-9_-]/g, ``)
    let target_url = `https://www.youtube.com/watch?v=${clean_id}&autoplay=1`
    console.log(`Llama picked video ID: ${clean_id}`)
    console.log(`Opening Thorium directly: ${target_url}`)

    let command_args = [...browser_args, target_url]
    let child_proc = spawn(browser, command_args, {detached: true, stdio: `ignore`})

    child_proc.on(`error`, (error) => {
      console.error(`Failed to launch Thorium:`, error)
    })

    child_proc.unref()
  }
  else {
    console.log(`Llama could not find a suitable video.`)
  }
}

run_youtube_agent()