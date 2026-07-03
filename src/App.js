import { useState, useRef, useEffect } from "react";

// ── Supabase config ───────────────────────────────────────────────────────
const SUPABASE_URL = "https://xskosgjaaltbdkgfjntw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhza29zZ2phYWx0YmRrZ2ZqbnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NjgxMTEsImV4cCI6MjA5ODU0NDExMX0.37pNPgW1U6VjO3va-w86n-T93AVnhuAVz6VDmraEoSc";

async function saveSubmission(teamCode, coachName, results) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify({ 
        team_code: teamCode.toUpperCase().trim(), 
        coach_name: coachName||"Anonymous", 
        results: results 
      })
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Supabase insert error:", res.status, err);
      return false;
    }
    return true;
  } catch(e) {
    console.error("Save error:", e);
    return false;
  }
}

async function fetchTeamSubmissions(teamCode) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/submissions?team_code=eq.${encodeURIComponent(teamCode.toUpperCase().trim())}&select=*`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("Supabase fetch error:", res.status, err);
      return [];
    }
    return res.json();
  } catch(e) {
    console.error("Fetch error:", e);
    return [];
  }
}


const NEUTRAL = "#64748b";
const LETTERS = ["A","B","C","D"];
const KEYS = ["ecological","gamesbased","cognitive","behaviourist"];
const LABELS = { ecological:"Ecological / CLA", gamesbased:"Games-based", cognitive:"Cognitive", behaviourist:"Behaviourist" };
const COLORS = { ecological:"#22c55e", gamesbased:"#f59e0b", cognitive:"#3b82f6", behaviourist:"#ef4444" };
const SCHOOL_MAP = { ecological:"Ecological", gamesbased:"Games-based", cognitive:"Cognitive", behaviourist:"Behaviourist" };

// ── Text colour constants (no more dim greys) ──────────────────────────────
const T = {
  primary:   "#f8fafc",   // headings, key labels
  body:      "#e2e8f0",   // body text
  secondary: "#cbd5e1",   // supporting text
  muted:     "#94a3b8",   // captions, metadata
  faint:     "#64748b",   // dividers, placeholders — used sparingly
};

function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
function shuffleWithSeed(arr,seed){
  const a=[...arr];let s=seed;
  for(let i=a.length-1;i>0;i--){s=(s*1664525+1013904223)&0xffffffff;const j=Math.abs(s)%(i+1);[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

// ── Plain-English question variants ───────────────────────────────────────
const Q_PLAIN = [
  {id:1,s:1,topic:"What is a skill?",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[
    {id:"a",school:"Behaviourist",text:"A skill is a movement you practise over and over until your body does it automatically without thinking."},
    {id:"b",school:"Cognitive",text:"A skill is stored in the brain as a kind of blueprint — when you see the right situation, you retrieve the right movement."},
    {id:"c",school:"Games-based",text:"A skill is a smart solution to a game situation — it might look different every time but gets the job done."},
    {id:"d",school:"Ecological",text:"A skill is a movement that naturally fits the moment — it emerges from the athlete reading and responding to what is around them."}
  ]},
  {id:2,s:1,topic:"How does learning happen?",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[
    {id:"a",school:"Behaviourist",text:"Athletes learn by doing the right thing repeatedly until it becomes second nature."},
    {id:"b",school:"Cognitive",text:"Athletes learn by building a clear mental picture of what good looks like and gradually getting closer to it."},
    {id:"c",school:"Games-based",text:"Athletes learn by playing games that challenge them to think and solve problems."},
    {id:"d",school:"Ecological",text:"Athletes learn by exploring and finding out what works in different situations through their own experience."}
  ]},
  {id:3,s:1,topic:"Movement variability",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[
    {id:"a",school:"Behaviourist",text:"If a movement looks different each time, the skill hasn't been practised enough yet."},
    {id:"b",school:"Cognitive",text:"Inconsistent movement means the athlete hasn't yet built a clear enough mental picture of what to do."},
    {id:"c",school:"Games-based",text:"Movements naturally vary depending on the game situation — that's normal and sorts itself out with experience."},
    {id:"d",school:"Ecological",text:"Varying your movement is actually useful — athletes need to adapt what they do to fit the situation they're in."}
  ]},
  {id:4,s:1,topic:"Role of errors",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[
    {id:"a",school:"Behaviourist",text:"Mistakes need to be corrected straight away before the athlete gets used to doing it wrong."},
    {id:"b",school:"Cognitive",text:"Mistakes show the athlete hasn't fully understood what to do yet, so more explanation is needed."},
    {id:"c",school:"Games-based",text:"Mistakes are part of playing — athletes naturally improve as their understanding of the game grows."},
    {id:"d",school:"Ecological",text:"Mistakes are useful information — they show what the athlete is still figuring out and are a normal part of learning."}
  ]},
  {id:5,s:1,topic:"Athlete-environment relationship",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[
    {id:"a",school:"Behaviourist",text:"The environment is the setting where practice happens — I control it to make sure athletes practise correctly."},
    {id:"b",school:"Cognitive",text:"The environment gives athletes information to take in, process, and use to decide what to do."},
    {id:"c",school:"Games-based",text:"The game environment is the main driver of learning — it presents the problems athletes need to solve."},
    {id:"d",school:"Ecological",text:"Athletes and their environment are connected — you can't understand how someone moves without looking at the situation they're in."}
  ]},
  {id:6,s:1,topic:"Mind and body",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[
    {id:"a",school:"Behaviourist",text:"Physical training and technical practice are separate things — both are important but they are developed differently."},
    {id:"b",school:"Cognitive",text:"What an athlete thinks drives what they do physically — the mind is in charge."},
    {id:"c",school:"Games-based",text:"Thinking and physical execution are connected through playing, though they can still be worked on separately."},
    {id:"d",school:"Ecological",text:"Thinking and moving are part of the same thing — you can't separate them in real practice."}
  ]},
  {id:7,s:1,topic:"Performance vs learning",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[
    {id:"a",school:"Behaviourist",text:"If an athlete can do the skill correctly and consistently in practice, they've learned it."},
    {id:"b",school:"Cognitive",text:"Real learning means the athlete can still do it correctly in different situations and under pressure."},
    {id:"c",school:"Games-based",text:"Learning shows up in games — if athletes make good decisions under pressure, they've learned."},
    {id:"d",school:"Ecological",text:"Doing well in practice doesn't prove learning — real learning means being able to adapt and perform in new situations over time."}
  ]},
  {id:8,s:1,topic:"Decision-making",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[
    {id:"a",school:"Behaviourist",text:"Athletes make quick decisions because they've drilled their responses until they become automatic."},
    {id:"b",school:"Cognitive",text:"Athletes read the situation, think through their options, and choose the best response based on what they know."},
    {id:"c",school:"Games-based",text:"Athletes read the game, recognise patterns, and pick the best solution based on their experience."},
    {id:"d",school:"Ecological",text:"Athletes pick up cues from what's happening around them and their movement response flows naturally from that."}
  ]},
  {id:9,s:1,topic:"Individual differences",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[
    {id:"a",school:"Behaviourist",text:"Athletes who have practised correctly for longer will simply be better than those who haven't."},
    {id:"b",school:"Cognitive",text:"Some athletes just think better under pressure and have built smarter mental models through experience."},
    {id:"c",school:"Games-based",text:"Some athletes simply read the game better and make smarter decisions than others."},
    {id:"d",school:"Ecological",text:"Every athlete has their own way of moving that suits their body and background — there's no single correct approach."}
  ]},
  {id:10,s:1,topic:"What does expertise look like?",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[
    {id:"a",school:"Behaviourist",text:"An expert athlete does the right thing automatically every time — they don't have to think about it."},
    {id:"b",school:"Cognitive",text:"An expert athlete can quickly read any situation and make the right decision under pressure."},
    {id:"c",school:"Games-based",text:"An expert athlete reads the game brilliantly and consistently does the right thing at the right time."},
    {id:"d",school:"Ecological",text:"An expert athlete is finely tuned to their environment — they pick up small cues others miss and move in a way that perfectly fits the moment."}
  ]},
  {id:11,s:2,topic:"Designing practice",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[
    {id:"a",school:"Behaviourist",text:"I set up drills that focus on one specific skill, keeping things stable and predictable so athletes can repeat it correctly."},
    {id:"b",school:"Cognitive",text:"I design tasks that help athletes understand what good looks like and gradually build up to more complex situations."},
    {id:"c",school:"Games-based",text:"I set up games that force athletes to deal with the problems I want them to get better at solving."},
    {id:"d",school:"Ecological",text:"I design practice that feels like the real thing — with the same information and challenges athletes face when they compete."}
  ]},
  {id:12,s:2,topic:"Giving instructions",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[
    {id:"a",school:"Behaviourist",text:"I tell athletes clearly what the correct movement looks like and exactly what they should be doing with their body."},
    {id:"b",school:"Cognitive",text:"I explain what athletes should be thinking about, what to look for, and what the right response is."},
    {id:"c",school:"Games-based",text:"I ask questions to get athletes thinking about what the game is asking of them and how to solve it."},
    {id:"d",school:"Ecological",text:"I try to say as little as possible — I tweak the task itself to point athletes toward what they need to notice."}
  ]},
  {id:13,s:2,topic:"Using demonstrations",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[
    {id:"a",school:"Behaviourist",text:"I show athletes what the correct technique looks like so they have a clear model to copy."},
    {id:"b",school:"Cognitive",text:"I demonstrate the movement or decision and walk athletes through the key things to focus on."},
    {id:"c",school:"Games-based",text:"I show different ways of solving a game problem and ask athletes which might work best."},
    {id:"d",school:"Ecological",text:"I show a range of possible solutions rather than one correct answer — to open up athletes' thinking."}
  ]},
  {id:14,s:2,topic:"Giving feedback",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[
    {id:"a",school:"Behaviourist",text:"I give immediate feedback after each attempt — telling athletes what was right, what was wrong, and what to change."},
    {id:"b",school:"Cognitive",text:"I explain what went wrong in their movement or decision and how to fix it next time."},
    {id:"c",school:"Games-based",text:"I ask athletes what they saw and what they were trying to do, and guide them toward better answers."},
    {id:"d",school:"Ecological",text:"I often hold back feedback and let athletes figure it out. When I do step in, I point them toward what to look for in the environment."}
  ]},
  {id:15,s:2,topic:"Structuring progression",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[
    {id:"a",school:"Behaviourist",text:"I break skills into parts, work on each one separately, then put them together once each part is solid."},
    {id:"b",school:"Cognitive",text:"I start simple and build up, making sure athletes understand and can execute each level before moving on."},
    {id:"c",school:"Games-based",text:"I start with simple game versions and build toward the full game as athletes improve."},
    {id:"d",school:"Ecological",text:"I keep the full task but adjust things like space or numbers to make it easier or harder without stripping out the real challenge."}
  ]},
  {id:16,s:2,topic:"Athlete involvement",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[
    {id:"a",school:"Behaviourist",text:"I plan the sessions. Athletes trust my expertise and follow the programme I design."},
    {id:"b",school:"Cognitive",text:"I explain why we're doing what we're doing and involve athletes in setting goals, but I design the programme."},
    {id:"c",school:"Games-based",text:"I regularly ask athletes what they want to work on and build that into my game-based tasks."},
    {id:"d",school:"Ecological",text:"Athletes help design the sessions. Their views and experiences shape how I set things up."}
  ]},
  {id:17,s:2,topic:"Preparing for competition",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[
    {id:"a",school:"Behaviourist",text:"I drill techniques until they're automatic so athletes don't have to think under pressure — they just execute."},
    {id:"b",school:"Cognitive",text:"I build mental skills alongside technical practice and bring them together as athletes get closer to competing."},
    {id:"c",school:"Games-based",text:"I use competitive game formats throughout training so athletes are always practising under real pressure."},
    {id:"d",school:"Ecological",text:"I design practice that mirrors competition as closely as possible — the pressure is built into the environment."}
  ]},
  {id:18,s:2,topic:"Working with specialists",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[
    {id:"a",school:"Behaviourist",text:"Each specialist does their own job. I coordinate them, but physical, technical, mental, and tactical work happen separately."},
    {id:"b",school:"Cognitive",text:"Specialists support each other — physical and mental capacity needs to match the technical and tactical demands."},
    {id:"c",school:"Games-based",text:"I try to bring physical and tactical work into games, though mental skills and data analysis are still mostly separate."},
    {id:"d",school:"Ecological",text:"I see all the different areas as connected. I try to design practice where physical, technical, tactical, and mental challenges are all present at the same time."}
  ]},
  {id:19,s:2,topic:"Using video and data",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[
    {id:"a",school:"Behaviourist",text:"I use video to show athletes what correct technique looks like and point out where they've gone wrong."},
    {id:"b",school:"Cognitive",text:"I use video and data to help athletes understand their patterns and what they need to improve."},
    {id:"c",school:"Games-based",text:"I mainly use video to analyse tactical patterns — what's working in games and what isn't."},
    {id:"d",school:"Ecological",text:"I look at video to understand the relationship between what the athlete was picking up from their environment and how they moved in response."}
  ]},
  {id:20,s:2,topic:"Knowing if coaching is working",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[
    {id:"a",school:"Behaviourist",text:"I know it's working when athletes perform the skill correctly and reliably in practice — consistent execution tells me they've learned it."},
    {id:"b",school:"Cognitive",text:"I know it's working when athletes can execute correctly and make good decisions in a range of situations, including under pressure."},
    {id:"c",school:"Games-based",text:"I know it's working when athletes make better decisions and solve problems more effectively in games."},
    {id:"d",school:"Ecological",text:"I know it's working when athletes can adapt — when they can handle new problems, retain skills over time, and perform in conditions they haven't trained in before."}
  ]},
];

const Q=[
  {id:1,s:1,topic:"What is a skill?",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[{id:"a",school:"Behaviourist",text:"A skill is a learned movement pattern that, when practised correctly and repeatedly, becomes automatic and consistent."},{id:"b",school:"Cognitive",text:"A skill is a stored movement programme in the brain, retrieved and executed when the right cues are recognised."},{id:"c",school:"Games-based",text:"A skill is a tactical solution to a game problem that looks different depending on the situation but serves the same purpose."},{id:"d",school:"Ecological",text:"A skill is a functional movement solution that emerges from the interaction between an athlete, their body, and the specific environment."}]},
  {id:2,s:1,topic:"How does learning happen?",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[{id:"a",school:"Behaviourist",text:"Learning happens when correct movements are repeatedly reinforced until they become habitual and automatic."},{id:"b",school:"Cognitive",text:"Learning happens when athletes build and refine accurate mental representations of what good movement looks and feels like."},{id:"c",school:"Games-based",text:"Learning happens when athletes develop tactical understanding through solving game-based problems over time."},{id:"d",school:"Ecological",text:"Learning happens when athletes explore and fine-tune the relationship between their actions and the information available in their environment."}]},
  {id:3,s:1,topic:"Movement variability",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[{id:"a",school:"Behaviourist",text:"Movement variability is error. It means the skill is not yet properly learned and needs more practice to become consistent."},{id:"b",school:"Cognitive",text:"Movement variability reflects inconsistency in mental representations and should be reduced through clearer instruction."},{id:"c",school:"Games-based",text:"Movement variability is natural in game situations and resolves itself as tactical understanding improves."},{id:"d",school:"Ecological",text:"Movement variability is a functional resource. Athletes use it to adapt their movements to the constantly changing demands of their environment."}]},
  {id:4,s:1,topic:"Role of errors",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[{id:"a",school:"Behaviourist",text:"Errors are deviations from correct technique and should be corrected immediately before bad habits form."},{id:"b",school:"Cognitive",text:"Errors signal a gap in the athlete's mental model and need to be addressed through explanation and re-instruction."},{id:"c",school:"Games-based",text:"Errors are a natural part of playing and competing. They are resolved as game understanding develops."},{id:"d",school:"Ecological",text:"Errors are information about the current state of the athlete's perception-action relationship and are a necessary part of learning."}]},
  {id:5,s:1,topic:"Athlete-environment relationship",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[{id:"a",school:"Behaviourist",text:"The environment provides the conditions in which the athlete practises, a backdrop the coach controls to ensure correct responses occur."},{id:"b",school:"Cognitive",text:"The environment provides information that the athlete's brain processes and uses to select and execute the right movement programme."},{id:"c",school:"Games-based",text:"The environment, particularly the game, is the primary driver of learning. It creates the problems athletes need to solve."},{id:"d",school:"Ecological",text:"The athlete and environment are a coupled system. You cannot understand skill without understanding the specific environment in which it is performed."}]},
  {id:6,s:1,topic:"Mind and body",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[{id:"a",school:"Behaviourist",text:"The mind and body are trained separately. Physical conditioning develops the body and technical practice develops movement patterns."},{id:"b",school:"Cognitive",text:"The mind directs the body. Cognitive processes such as attention, memory, and decision-making drive movement execution."},{id:"c",school:"Games-based",text:"Tactical thinking and physical execution are connected through game play, but are still best developed through different types of practice."},{id:"d",school:"Ecological",text:"Mind and body are inseparable. Thinking, perceiving, and moving are all part of the same system and cannot be meaningfully separated in practice."}]},
  {id:7,s:1,topic:"Performance vs learning",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[{id:"a",school:"Behaviourist",text:"If an athlete performs a skill correctly and consistently in practice, that tells me they have learned it."},{id:"b",school:"Cognitive",text:"Learning is demonstrated when an athlete can retain and apply a skill correctly across different contexts and under pressure."},{id:"c",school:"Games-based",text:"Learning shows up in games. If athletes can solve problems and make good decisions under pressure, they have learned."},{id:"d",school:"Ecological",text:"Performance and learning are distinct. Genuine learning is only confirmed by retention, transfer, and adaptability over time."}]},
  {id:8,s:1,topic:"Decision-making",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[{id:"a",school:"Behaviourist",text:"Decision-making is the result of conditioned responses. Athletes respond automatically based on what has been drilled."},{id:"b",school:"Cognitive",text:"Decision-making is a cognitive process. Athletes perceive cues, access mental representations, and select the most appropriate response."},{id:"c",school:"Games-based",text:"Decision-making is tactical. Athletes read the game, recognise patterns, and choose solutions based on their understanding of the situation."},{id:"d",school:"Ecological",text:"Decision-making is inseparable from perception and movement. Athletes directly pick up information from the environment that guides action."}]},
  {id:9,s:1,topic:"Individual differences",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[{id:"a",school:"Behaviourist",text:"Individual differences reflect different levels of practice and reinforcement. Athletes who have trained more correctly will perform better."},{id:"b",school:"Cognitive",text:"Individual differences reflect different cognitive capacities, knowledge structures, and mental representations built through experience."},{id:"c",school:"Games-based",text:"Individual differences are mostly tactical. Some athletes read the game better and make smarter decisions than others."},{id:"d",school:"Ecological",text:"Individual differences reflect unique movement signatures. Each athlete has their own optimal way of solving movement problems based on their body, history, and environment."}]},
  {id:10,s:1,topic:"What does expertise look like?",stem:"Drag each pin to show how closely each statement reflects your view.",opts:[{id:"a",school:"Behaviourist",text:"An expert athlete performs the correct technique consistently and automatically across all situations without needing to think about it."},{id:"b",school:"Cognitive",text:"An expert athlete has highly developed mental representations and can rapidly process information to make accurate decisions under pressure."},{id:"c",school:"Games-based",text:"An expert athlete reads the game exceptionally well and consistently makes the right tactical decisions at the right time."},{id:"d",school:"Ecological",text:"An expert athlete has a highly attuned perception-action system. They pick up subtle information from the environment and move in ways precisely fitted to the demands of each situation."}]},
  {id:11,s:2,topic:"Designing practice",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[{id:"a",school:"Behaviourist",text:"I design drills that isolate the specific technique I want to develop, keeping conditions stable and repeatable so athletes can perfect the movement."},{id:"b",school:"Cognitive",text:"I design practice tasks that build mental models of correct technique and decision-making, progressing from simple to complex scenarios."},{id:"c",school:"Games-based",text:"I design modified games that create the tactical problems I want athletes to solve, adjusting rules to focus on specific game principles."},{id:"d",school:"Ecological",text:"I design practice environments that reproduce the key information and action opportunities athletes encounter in performance, keeping the task whole wherever possible."}]},
  {id:12,s:2,topic:"Giving instructions",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[{id:"a",school:"Behaviourist",text:"I give clear, specific instructions about what the correct movement looks like and what athletes should focus on doing with their body."},{id:"b",school:"Cognitive",text:"I explain what athletes should be thinking about, what cues to look for, and what the correct decision or movement response looks like."},{id:"c",school:"Games-based",text:"I ask questions to focus athletes' attention on the tactical problem the game is presenting and what they need to do to solve it."},{id:"d",school:"Ecological",text:"I say as little as possible verbally. I adjust the task constraints to direct athletes' attention toward the relevant information in the environment."}]},
  {id:13,s:2,topic:"Using demonstrations",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[{id:"a",school:"Behaviourist",text:"I demonstrate the correct technique so athletes have a clear model to copy and a standard to aim for."},{id:"b",school:"Cognitive",text:"I demonstrate the correct movement pattern or decision sequence and explain the key points athletes should focus on replicating."},{id:"c",school:"Games-based",text:"I use demonstrations to show different tactical options, then ask athletes which solution might work best and why."},{id:"d",school:"Ecological",text:"I use demonstrations to draw attention to movement possibilities, showing a range of solutions rather than a single correct form."}]},
  {id:14,s:2,topic:"Giving feedback",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[{id:"a",school:"Behaviourist",text:"I give immediate, specific feedback after each attempt, telling athletes what was correct, what was wrong, and exactly what to do differently."},{id:"b",school:"Cognitive",text:"I give informational feedback that helps athletes understand what went wrong in their technique or decision and how to correct it."},{id:"c",school:"Games-based",text:"I ask athletes questions about what they saw and what they were trying to do tactically, guiding them toward better solutions."},{id:"d",school:"Ecological",text:"I often withhold immediate feedback to allow athletes to self-regulate. When I do give feedback I direct attention to the information in the environment they may not be picking up."}]},
  {id:15,s:2,topic:"Structuring progression",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[{id:"a",school:"Behaviourist",text:"I break skills into their component parts, develop each one separately, then gradually combine them once each part is mastered."},{id:"b",school:"Cognitive",text:"I build from simple to complex scenarios, ensuring athletes have the correct technique and cognitive understanding at each level before progressing."},{id:"c",school:"Games-based",text:"I start with the whole game and progressively increase its complexity, using simpler game forms first and building toward the full game."},{id:"d",school:"Ecological",text:"I keep the task whole and adjust constraints such as space, numbers, or equipment to make the task easier or harder without removing the key information sources."}]},
  {id:16,s:2,topic:"Athlete involvement",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[{id:"a",school:"Behaviourist",text:"I plan and deliver the programme. Athletes trust my expertise and follow the sessions I design for them."},{id:"b",school:"Cognitive",text:"I explain the rationale for my programme and involve athletes in goal-setting, but the design itself is based on my technical expertise."},{id:"c",school:"Games-based",text:"I regularly ask athletes what aspects of their game they want to work on and use their input to shape game-based tasks."},{id:"d",school:"Ecological",text:"I actively co-design practice with athletes. Their perceptions, preferences, and experiences are central to how I shape the learning environment."}]},
  {id:17,s:2,topic:"Preparing for competition",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[{id:"a",school:"Behaviourist",text:"I ensure techniques are highly automated through repetition so that under pressure athletes do not have to think. They just execute."},{id:"b",school:"Cognitive",text:"I build mental toughness and decision-making skills alongside technical practice and integrate them as athletes approach competition readiness."},{id:"c",school:"Games-based",text:"I use competitive game formats regularly throughout training so athletes are constantly practising under game-like pressure."},{id:"d",school:"Ecological",text:"I design practice environments that closely replicate the information, decisions, and physical demands of competition. Pressure is built into the representative design."}]},
  {id:18,s:2,topic:"Working with specialists",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[{id:"a",school:"Behaviourist",text:"Each specialist works in their own domain. I coordinate their inputs but physical, technical, mental, and tactical aspects are developed separately."},{id:"b",school:"Cognitive",text:"I work with specialists to ensure athletes have the physical capacity and mental skills to execute technical and tactical requirements. Each domain supports the others."},{id:"c",school:"Games-based",text:"I try to integrate tactical and physical work within game-based formats, though mental skills and analytics are still mostly addressed separately."},{id:"d",school:"Ecological",text:"I work from the principle that physical, technical, tactical, and psychological dimensions are inseparable. I aim to create practice environments where all are present simultaneously."}]},
  {id:19,s:2,topic:"Using video and data",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[{id:"a",school:"Behaviourist",text:"I use video to show athletes the correct technique and highlight their errors, comparing their movement to the ideal model."},{id:"b",school:"Cognitive",text:"I use video and data to help athletes understand their technical and decision-making patterns, building awareness of what they need to improve."},{id:"c",school:"Games-based",text:"I use video primarily to analyse tactical patterns, reviewing game footage to identify what is and is not working tactically."},{id:"d",school:"Ecological",text:"I use video and data to examine the relationship between the information available to the athlete and the actions they took, looking at perception-action coupling rather than technique in isolation."}]},
  {id:20,s:2,topic:"Knowing if coaching is working",stem:"Drag each pin to show how closely each statement reflects your approach.",opts:[{id:"a",school:"Behaviourist",text:"I know it is working when athletes perform the skill correctly and consistently in practice. Reliable, repeatable execution tells me learning has occurred."},{id:"b",school:"Cognitive",text:"I know it is working when athletes can demonstrate correct technique and make good decisions under a range of conditions, including pressure situations."},{id:"c",school:"Games-based",text:"I know it is working when athletes are making better decisions and solving tactical problems more effectively in games."},{id:"d",school:"Ecological",text:"I know it is working when athletes show improved adaptability, when they can solve novel movement problems, retain skills over time, and perform in conditions different from those they trained in."}]},
];

// ── Four-orientation intro data ────────────────────────────────────────────
const ORIENTATIONS = [
  { key:"behaviourist", color:"#ef4444", label:"Behaviourist / Traditional",
    icon:"🔁",
    short:"Skill is built through repetition and reinforcement. The coach demonstrates correct technique, corrects errors quickly, and drills movement until it becomes automatic." },
  { key:"cognitive", color:"#3b82f6", label:"Cognitive / Information Processing",
    icon:"🧠",
    short:"Skill is a mental blueprint stored in the brain. The coach helps athletes build accurate mental models through instruction, explanation, and scenario-based practice." },
  { key:"gamesbased", color:"#f59e0b", label:"Games-Based / Game Sense",
    icon:"🎮",
    short:"The game itself is the teacher. Athletes learn by solving tactical problems inside modified games. The coach designs game challenges and asks questions rather than giving answers." },
  { key:"ecological", color:"#22c55e", label:"Ecological / Constraints-Led",
    icon:"🌱",
    short:"Skill emerges from the relationship between the athlete and their environment. The coach designs rich environments and adjusts task constraints, letting athletes find their own movement solutions." },
];

function makePetalSVG(scores,dominant,sz){
  sz=sz||220;
  const cx=sz/2,cy=sz/2,maxR=sz*0.30,minR=sz*0.05;
  const OS=[
    {key:"ecological",label:"Ecological",color:"#22c55e",dark:"#15803d",angle:45},
    {key:"gamesbased",label:"Games-based",color:"#f59e0b",dark:"#b45309",angle:135},
    {key:"behaviourist",label:"Behaviourist",color:"#ef4444",dark:"#b91c1c",angle:225},
    {key:"cognitive",label:"Cognitive",color:"#3b82f6",dark:"#1d4ed8",angle:315},
  ];
  let o="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 "+sz+" "+sz+"' width='"+sz+"' height='"+sz+"'><defs>";
  OS.forEach(q=>{o+="<radialGradient id='rg"+q.key+"' cx='50%' cy='50%' r='50%'><stop offset='0%' stop-color='"+q.color+"'/><stop offset='100%' stop-color='"+q.dark+"' stop-opacity='0.85'/></radialGradient>";});
  o+="<filter id='sf'><feDropShadow dx='0' dy='1' stdDeviation='3' flood-color='#000' flood-opacity='0.35'/></filter></defs>";
  o+="<line x1='"+cx+"' y1='"+(sz*0.05)+"' x2='"+cx+"' y2='"+(sz*0.95)+"' stroke='#333' stroke-width='1.2'/>";
  o+="<line x1='"+(sz*0.05)+"' y1='"+cy+"' x2='"+(sz*0.95)+"' y2='"+cy+"' stroke='#333' stroke-width='1.2'/>";
  OS.forEach(q=>{
    const s=Math.max(0.08,scores[q.key]||0);
    const ry=minR+s*(maxR-minR),rx=ry*0.52;
    const rad=q.angle*Math.PI/180;
    const ox=cx+Math.cos(rad)*ry*0.5,oy=cy-Math.sin(rad)*ry*0.5;
    const rot=(-q.angle+90);
    const op=q.key===dominant?"1":"0.4";
    o+="<ellipse cx='"+ox+"' cy='"+oy+"' rx='"+rx+"' ry='"+ry+"' fill='url(#rg"+q.key+")' filter='url(#sf)' opacity='"+op+"' transform='rotate("+rot+" "+ox+" "+oy+")'/>";
  });
  o+="<circle cx='"+cx+"' cy='"+cy+"' r='"+(sz*0.048)+"' fill='#111' stroke='#444' stroke-width='1.5'/>";
  OS.forEach(q=>{
    const rad=q.angle*Math.PI/180;
    const lx=cx+Math.cos(rad)*(maxR+sz*0.13),ly=cy-Math.sin(rad)*(maxR+sz*0.13);
    o+="<text x='"+lx+"' y='"+(ly+3)+"' text-anchor='middle' font-family='system-ui,sans-serif' font-size='8.5' font-weight='"+(q.key===dominant?"bold":"normal")+"' fill='"+(q.key===dominant?q.color:"#94a3b8")+"'>"+q.label+"</text>";
  });
  o+="</svg>";
  return o;
}

function makeReport(data){
  const name=data.name||"",bRaw=data.bRaw,pRaw=data.pRaw,bNorm=data.bNorm,pNorm=data.pNorm,bDom=data.bDom,pDom=data.pDom,interp=data.interp;
  const C={ecological:"#22c55e",gamesbased:"#f59e0b",cognitive:"#3b82f6",behaviourist:"#ef4444"};
  const LB={ecological:"Ecological / CLA",gamesbased:"Games-based",cognitive:"Cognitive",behaviourist:"Behaviourist"};
  const KS=["ecological","gamesbased","cognitive","behaviourist"];
  const date=new Date().toLocaleDateString("en-AU",{day:"numeric",month:"long",year:"numeric"});
  const aligned=bDom===pDom;
  const firstName=name.split(" ")[0];
  const byName=firstName?firstName+", ":"";
  const ofNameTitle=firstName?firstName:"Your";
  const ofName=firstName?firstName+"'s":"your";
  const bSorted=KS.slice().sort((a,b)=>(bRaw[b]||0)-(bRaw[a]||0));
  const pSorted=KS.slice().sort((a,b)=>(pRaw[b]||0)-(pRaw[a]||0));
  const bSecond=bSorted[1],pSecond=pSorted[1];

  const S1={
    ecological:byName+"your responses indicate a strongly ecological worldview. You understand skill as emerging from athlete-environment interaction, see movement variability as adaptive, and recognise perception and action as inseparable.",
    gamesbased:byName+"your responses indicate a predominantly games-based worldview. You understand skill as a tactical solution shaped by the game, and see learning as tactical understanding developed through play.",
    cognitive:byName+"your responses indicate a predominantly cognitive worldview. You understand skill as a mental representation that guides movement, and learning as the construction and refinement of accurate cognitive models.",
    behaviourist:byName+"your responses indicate a predominantly behaviourist worldview. You understand skill as a conditioned movement pattern developed through repetition and reinforcement.",
  };
  const S2={
    ecological:byName+"your responses indicate that your practice is strongly ecological. You design representative learning environments, manipulate constraints, and withhold feedback to promote self-regulation.",
    gamesbased:byName+"your responses indicate that your practice is primarily games-based. You design modified games, use tactical questioning, and measure success by athletes' ability to make good decisions under pressure.",
    cognitive:byName+"your responses indicate that your practice is primarily cognitive. You use explicit instruction and demonstrations, and design tasks that progress from simple to complex.",
    behaviourist:byName+"your responses indicate that your practice is primarily behaviourist. You rely on isolated drills, blocked repetition, and immediate corrective feedback.",
  };
  const OD={
    ecological:{color:"#22c55e",label:"Ecological / Constraints-Led",desc:"Skill emerges from the relationship between the athlete, the task, and the environment. Athletes find their own solutions by exploring well-designed environments. The coach designs constraints, not instructions.",bullets:["Representative learning design","Constraints shape movement solutions","Movement variability is functional","Minimal verbal instruction","Perception and action are inseparable"]},
    gamesbased:{color:"#f59e0b",label:"Games-Based / Game Sense",desc:"The game is the primary teacher. Tactical understanding develops through modified games. The coach designs game problems and uses questioning to develop decision-making.",bullets:["Modified and conditioned games","Tactical awareness through play","Guided discovery — questions not answers","Rules, space, numbers adjusted to target learning","TGfU / Game Sense"]},
    cognitive:{color:"#3b82f6",label:"Cognitive / Information Processing",desc:"Skill is a mental representation that guides movement. Learning involves building accurate cognitive models. The coach provides instruction that shapes the athlete's thinking.",bullets:["Mental models and decision-making schemas","Explicit instruction and tactical explanation","Video and data to build self-awareness","Scenario-based practice simple to complex","The mind directs the body"]},
    behaviourist:{color:"#ef4444",label:"Behaviourist / Traditional",desc:"Skill is a conditioned movement pattern built through repetition and reinforcement. The coach specifies correct performance and systematically corrects deviations.",bullets:["Isolated drills and blocked repetition","Immediate corrective feedback","Part-to-whole skill progression","Demonstrations of correct technique","Success means consistent, automatic execution"]},
  };

  const gap=KS.reduce((acc,k)=>acc+Math.abs((bRaw[k]||0)-(pRaw[k]||0)),0)/KS.length;
  const devAreas=[];
  if(bDom!==pDom) devAreas.push({color:"#f59e0b",title:"Closing the Beliefs-Practice Gap",body:"Your dominant belief orientation ("+LB[bDom]+") differs from your practice orientation ("+LB[pDom]+"). Focus on identifying the specific barriers that prevent your practice from reflecting your beliefs."});
  if(bDom==="ecological"||pDom==="ecological") devAreas.push({color:"#22c55e",title:"Representative Task Design",body:"The key practical skill for ecologically-oriented coaches is designing tasks that preserve the key perception-action relationships of performance while adjusting difficulty through constraints."});
  if(bDom==="behaviourist"||pDom==="behaviourist") devAreas.push({color:"#ef4444",title:"Examining Assumptions About Error and Variability",body:"Re-examine the role of error and variability in learning. Current skill acquisition research suggests variability is functional and adaptive. Consider experimenting with tasks that invite variability rather than eliminate it."});
  if(bDom==="cognitive"||pDom==="cognitive") devAreas.push({color:"#3b82f6",title:"Shifting from Instruction to Constraint",body:"Explore what happens when verbal instruction is reduced and environmental constraints are used instead. Try replacing one explanation per session with a task modification that makes the desired behaviour more likely to emerge naturally."});
  if(gap>0.25) devAreas.push({color:"#a8e063",title:"Understanding What Constrains Your Practice",body:"Your profile shows a meaningful gap between beliefs and practice. Identify what is preventing your practice from reflecting your beliefs."});
  if(devAreas.length===0) devAreas.push({color:"#a8e063",title:"Consolidating Coherent Practice",body:"Your beliefs and practice are well aligned. Focus on deepening theoretical understanding, building task design fluency, and articulating your philosophy clearly."});

  const dqs=[
    byName+"what does it mean to you that your beliefs are most strongly aligned with "+LB[bDom]+"? Where did that come from in your coaching journey?",
    bDom!==pDom?"There is a gap between your "+LB[bDom]+" beliefs and your "+LB[pDom]+" practice. What is driving that gap and is it something you want to change?":"Your beliefs and practice are aligned around "+LB[bDom]+". Is this something you have deliberately built, or has it developed naturally?",
    "Think of a recent session. Were there moments where your instinct was to intervene but you held back, or where you intervened but wished you had not?",
    "How do you explain to athletes why you coach the way you do? Does that explanation match what this profile reveals?",
    "When you watch another coach work, what do you notice first? What does that tell you about your own values?",
    "What aspects of your context most influence your practice? Are those influences helpful or constraining?",
    bDom==="ecological"||pDom==="ecological"?"How do you decide when an athlete needs a constraint changed versus more time in the current environment?":"When you correct technique, what theory of learning is guiding that decision?",
    "If you completed this reflection in 12 months, what would you want to be different and what would you want to stay the same?",
  ];

  const sk=KS.slice().sort((a,b)=>Math.abs((bRaw[b]||0)-(pRaw[b]||0))-Math.abs((bRaw[a]||0)-(pRaw[a]||0)));
  function sbar(k,v){return "<div style='margin-bottom:10px'><div style='display:flex;justify-content:space-between;margin-bottom:3px'><span style='font-size:11px;font-weight:700;color:"+C[k]+"'>"+LB[k]+"</span><span style='font-size:10px;color:#cbd5e1'>"+Math.round(v*100)+"%</span></div><div style='background:#111;border-radius:4px;height:7px'><div style='background:"+C[k]+";border-radius:4px;height:7px;width:"+Math.round(v*100)+"%;opacity:0.9'></div></div></div>";}
  function gbar(k,b,p){const gp=Math.abs(b-p),fl=gp>0.15;return "<div style='margin-bottom:16px'><div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:5px'><span style='font-size:13px;font-weight:700;color:"+C[k]+"'>"+LB[k]+"</span><span style='font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:"+(fl?"#f59e0b22":"#22c55e22")+";color:"+(fl?"#f59e0b":"#22c55e")+"'>"+(fl?"Gap: "+Math.round(gp*100)+"pts":"Aligned")+"</span></div><div style='font-size:9px;color:#cbd5e1;margin-bottom:2px'>See it</div><div style='background:#111;border-radius:4px;height:6px;margin-bottom:4px'><div style='background:"+C[k]+";border-radius:4px;height:6px;width:"+Math.round(b*100)+"%;opacity:0.9'></div></div><div style='font-size:9px;color:#cbd5e1;margin-bottom:2px'>Do it</div><div style='background:#111;border-radius:4px;height:6px'><div style='background:"+C[k]+";border-radius:4px;height:6px;width:"+Math.round(p*100)+"%;opacity:0.5'></div></div></div>";}
  function ocard(k,raw,isDom,is2nd){const od=OD[k],sc=Math.round(raw*100)+"%",op=isDom?"1":is2nd?"0.95":"0.85";let s="<div style='background:#1a1a1a;border-radius:12px;padding:18px 20px;margin-bottom:12px;border-left:4px solid "+od.color+";opacity:"+op+"'><div style='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px'><span style='font-size:14px;font-weight:800;color:"+od.color+"'>"+od.label+"</span><span style='font-size:11px;color:#cbd5e1'>("+sc+")</span>";if(isDom)s+="<span style='font-size:10px;background:"+od.color+"33;color:"+od.color+";padding:2px 8px;border-radius:10px'>Dominant</span>";if(is2nd)s+="<span style='font-size:10px;background:#44444433;color:#e2e8f0;padding:2px 8px;border-radius:10px'>2nd</span>";s+="</div><p style='font-size:13px;color:#e2e8f0;line-height:1.7;margin-bottom:10px'>"+od.desc+"</p><ul style='list-style:none;padding:0'>"+od.bullets.map(b=>"<li style='font-size:12px;color:#cbd5e1;margin-bottom:4px;padding-left:12px;position:relative'><span style='position:absolute;left:0;color:"+od.color+"'>·</span>"+b+"</li>").join("")+"</ul></div>";return s;}

  const css="*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#e2e8f0;line-height:1.65}.wrap{max-width:820px;margin:0 auto;padding:32px 32px 60px}.cover{background:#1a1a1a;border-radius:16px;padding:44px 40px;margin-bottom:36px;position:relative;overflow:hidden}.ct{position:absolute;top:0;left:0;right:0;height:4px;background:#a8e063}.sh{display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #222}.sn{width:28px;height:28px;border-radius:8px;background:#a8e063;color:#0a0a0a;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0}.st{font-size:17px;font-weight:800;color:#fff}.ss{font-size:12px;color:#cbd5e1}.sec{margin-bottom:32px}.card{background:#1a1a1a;border-radius:12px;padding:18px 22px;margin-bottom:12px}.cl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#a8e063;margin-bottom:8px}.card p{font-size:13px;color:#e2e8f0;line-height:1.75}.pr{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px}.pb{background:#1a1a1a;border-radius:14px;padding:18px 12px;text-align:center}.pl{font-size:10px;font-weight:700;color:#cbd5e1;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}.pn{font-size:12px;font-weight:700;margin-top:8px}.sr{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}.aw{background:#f59e0b11;border:1px solid #f59e0b55;color:#f8fafc;border-radius:10px;padding:14px 16px;margin-bottom:14px;font-size:13px;line-height:1.65}.ag{background:#22c55e11;border:1px solid #22c55e55;color:#f8fafc;border-radius:10px;padding:14px 16px;margin-bottom:14px;font-size:13px;line-height:1.65}.dv{height:1px;background:#222;margin:28px 0}.ql{list-style:none}.ql li{padding:13px 16px;background:#1a1a1a;border-radius:10px;margin-bottom:10px;font-size:13px;color:#e2e8f0;line-height:1.65;border-left:3px solid #a8e063}.ql li::before{content:'Q  ';font-weight:800;color:#a8e063}.ft{margin-top:44px;padding-top:22px;border-top:1px solid #222;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px}.ft p{font-size:11px;color:#94a3b8}.gc{color:#a8e063;font-weight:700}@media print{body{background:#fff!important;color:#111!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.cover{background:#0a0a0a!important}.card,.pb{background:#f8f8f8!important;border:1px solid #ddd!important}.dv{background:#ddd!important}}";

  const bSVG=makePetalSVG(bNorm,bDom,210);
  const pSVG=makePetalSVG(pNorm,pDom,210);

  let h="<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'/><title>Coaching Beliefs Profile"+(name?" - "+name:"")+"</title><style>"+css+"</style></head><body><div class='wrap'>";
  h+="<div class='cover'><div class='ct'></div><div style='display:flex;align-items:center;gap:14px;margin-bottom:28px'><svg xmlns='http://www.w3.org/2000/svg' width='46' height='46' viewBox='0 0 100 100'><text x='4' y='70' font-family='Georgia,serif' font-style='italic' font-weight='900' font-size='72' fill='white'>cc</text><line x1='6' y1='84' x2='70' y2='84' stroke='#a8e063' stroke-width='6' stroke-linecap='round'/></svg><div><div style='font-size:10px;font-weight:800;color:#a8e063;letter-spacing:3px;text-transform:uppercase'>Constraints</div><div style='font-size:10px;font-weight:800;color:#fff;letter-spacing:3px;text-transform:uppercase'>Collective</div></div></div>";
  h+="<div style='font-size:26px;font-weight:900;color:#fff;margin-bottom:4px'>Coaching Beliefs Profiler</div><div style='font-size:12px;color:#a8e063;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:24px'>Personal Profile</div>";
  h+="<div style='display:flex;gap:28px;flex-wrap:wrap;margin-bottom:18px'><div><div style='font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#cbd5e1;margin-bottom:3px'>Coach</div><div style='font-size:15px;font-weight:700;color:#fff'>"+(name||"Anonymous")+"</div></div><div><div style='font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#cbd5e1;margin-bottom:3px'>Date</div><div style='font-size:15px;font-weight:700;color:#fff'>"+date+"</div></div></div>";
  h+="<div style='background:#1e293b;border-radius:10px;padding:12px 16px;border-left:3px solid #a8e063'><p style='font-size:13px;color:#e2e8f0;line-height:1.7;margin:0'>This profile explored the relationship between your beliefs about skill learning and how those beliefs show up in your coaching.</p></div></div>";
  const orientHTML=[
    {key:"behaviourist",color:"#ef4444",icon:"🔁",label:"Behaviourist / Traditional",short:"Skill is built through repetition and reinforcement. The coach demonstrates correct technique, corrects errors quickly, and drills movement until it becomes automatic."},
    {key:"cognitive",color:"#3b82f6",icon:"🧠",label:"Cognitive / Information Processing",short:"Skill is a mental blueprint stored in the brain. The coach helps athletes build accurate mental models through instruction, explanation, and scenario-based practice."},
    {key:"gamesbased",color:"#f59e0b",icon:"🎮",label:"Games-Based / Game Sense",short:"The game itself is the teacher. Athletes learn by solving tactical problems inside modified games. The coach designs game challenges and asks questions rather than giving answers."},
    {key:"ecological",color:"#22c55e",icon:"🌱",label:"Ecological / Constraints-Led",short:"Skill emerges from the relationship between the athlete and their environment. The coach designs rich environments and adjusts task constraints, letting athletes find their own movement solutions."},
  ];
  h+="<div class='sec'><div class='sh'><div class='sn'>6</div><div><div class='st'>The Four Coaching Orientations</div><div class='ss'>A reference guide to the framework behind this profiler</div></div></div>";
  h+="<p style='font-size:13px;color:#e2e8f0;line-height:1.75;margin-bottom:16px'>The questions in this profiler were built around four broad theoretical orientations. Most coaches hold a mixture of these views — your profile above shows how your beliefs and practice map across them.</p>";
  h+=orientHTML.map(o=>"<div style='background:#1a1a1a;border-radius:12px;padding:14px 18px;margin-bottom:12px;border-left:4px solid "+o.color+"'><div style='display:flex;align-items:center;gap:8px;margin-bottom:6px'><span style='font-size:18px'>"+o.icon+"</span><span style='font-size:14px;font-weight:800;color:"+o.color+"'>"+o.label+"</span></div><p style='font-size:13px;color:#e2e8f0;line-height:1.7;margin:0'>"+o.short+"</p></div>").join("");
  h+="</div><div class='dv'></div>";
  h+="<div class='sec'><div class='sh'><div class='sn'>7</div><div><div class='st'>Where Did You Think You Sat?</div><div class='ss'>A reflective prompt now that you have seen the orientations</div></div></div>";
  h+="<div class='card' style='margin-bottom:12px'><div class='cl'>Before you read this report</div><p>Before you completed this reflection, you probably had some sense of what kind of coach you are. Now that you have seen the four orientations and your profile, take a moment to consider the following prompts.</p></div>";
  h+="<ul class='ql'><li>Before reading this report, which of the four orientations did you think best described your coaching, or did you not recognise yourself in any of them?</li><li>Does your profile match your instinct? If it does, what does that tell you? If it does not, what might explain the difference?</li><li>Many coaches describe themselves as pragmatic and not aligned with any particular theory. Having now read the four orientations, do you see traces of a theoretical position in your coaching that you were not previously aware of?</li><li>Which orientation feels most foreign to the way you currently coach? What would it take for you to understand that approach from the inside?</li><li>Are there any statements you found difficult to place where no option felt quite right? What does that tell you about the complexity of your beliefs?</li></ul></div><div class='dv'></div>";
  h+="<div class='sec'><div class='sh'><div class='sn'>8</div><div><div class='st'>"+ofNameTitle+" Coaching Beliefs — Summary</div><div class='ss'>A brief overview of what your responses revealed</div></div></div>";
  h+="<div class='card'><div class='cl'>Your dominant belief orientation</div><p>"+S1[bDom].charAt(0).toUpperCase()+S1[bDom].slice(1)+"</p></div>";
  h+="<div class='card'><div class='cl'>Your practice orientation</div><p>"+S2[pDom].charAt(0).toUpperCase()+S2[pDom].slice(1)+"</p></div></div><div class='dv'></div>";
  h+="<div class='sec'><div class='sh'><div class='sn'>9</div><div><div class='st'>"+ofNameTitle+" Coaching Beliefs Profile</div><div class='ss'>How your beliefs and practice map across the four orientations</div></div></div>";
  h+="<p style='font-size:14px;color:#f8fafc;line-height:1.8;margin-bottom:6px'><strong style='color:"+C[bDom]+"'>"+byName+"your dominant belief orientation is "+LB[bDom]+"</strong>, with <strong style='color:"+C[bSecond]+"'>"+LB[bSecond]+"</strong> as your second preference.</p>";
  h+="<p style='font-size:14px;color:#f8fafc;line-height:1.8;margin-bottom:20px'>In practice, <strong style='color:"+C[pDom]+"'>"+LB[pDom]+"</strong> is your dominant orientation"+(pDom!==bDom?" — which differs from your beliefs, a gap worth exploring.":" — consistent with your belief profile.")+"</p>";
  h+="<p style='font-size:13px;color:#cbd5e1;line-height:1.75;margin-bottom:18px'>The diagrams below show the shape of "+ofName+" beliefs and practice. The larger each petal, the more strongly you scored toward that orientation.</p>";
  h+="<div class='pr'><div class='pb'><div class='pl'>How I See It - Beliefs</div>"+bSVG+"<div class='pn' style='color:"+C[bDom]+"'>"+LB[bDom]+"</div></div><div class='pb'><div class='pl'>How I Do It - Practice</div>"+pSVG+"<div class='pn' style='color:"+C[pDom]+"'>"+LB[pDom]+"</div></div></div>";
  h+="<div class='sr'><div class='card'><div class='cl'>Belief Scores</div>"+KS.map(k=>sbar(k,bRaw[k]||0)).join("")+"</div><div class='card'><div class='cl'>Practice Scores</div>"+KS.map(k=>sbar(k,pRaw[k]||0)).join("")+"</div></div></div><div class='dv'></div>";
  h+="<div class='sec'><div class='sh'><div class='sn'>10</div><div><div class='st'>How "+ofNameTitle+" Sees the World of Skill Learning</div><div class='ss'>Unpacking what your belief profile means</div></div></div>";
  h+="<div class='card'><div class='cl'>Summary</div><p>"+S1[bDom].charAt(0).toUpperCase()+S1[bDom].slice(1)+"</p></div>";
  [bDom,...KS.filter(k=>k!==bDom)].forEach(k=>{h+=ocard(k,bRaw[k]||0,k===bDom,k===bSecond);});
  h+="</div><div class='dv'></div>";
  h+="<div class='sec'><div class='sh'><div class='sn'>11</div><div><div class='st'>How "+ofNameTitle+" Coaches in Practice</div><div class='ss'>Unpacking what your practice profile means</div></div></div>";
  h+="<div class='card'><div class='cl'>Summary</div><p>"+S2[pDom].charAt(0).toUpperCase()+S2[pDom].slice(1)+"</p></div>";
  [pDom,...KS.filter(k=>k!==pDom)].forEach(k=>{h+=ocard(k,pRaw[k]||0,k===pDom,k===pSecond);});
  h+="</div><div class='dv'></div>";
  h+="<div class='sec'><div class='sh'><div class='sn'>12</div><div><div class='st'>Beliefs-Practice Alignment</div><div class='ss'>Where "+ofName+" beliefs and practice align and where they diverge</div></div></div>";
  h+=aligned?"<div class='ag'>"+byName+"your belief and practice orientations are aligned within a "+LB[bDom]+" framework.</div>":"<div class='aw'>"+byName+"a beliefs-practice gap has been detected. Your beliefs lean toward "+LB[bDom]+" while your practice leans toward "+LB[pDom]+".</div>";
  h+=sk.map(k=>gbar(k,bRaw[k]||0,pRaw[k]||0)).join("");
  h+="<div class='card' style='margin-top:12px'><div class='cl'>Interpretation</div><p>"+interp+"</p></div></div><div class='dv'></div>";
  h+="<div class='sec'><div class='sh'><div class='sn'>13</div><div><div class='st'>Areas for Development</div><div class='ss'>Specific opportunities based on "+ofName+" profile</div></div></div>";
  h+=devAreas.map(da=>"<div style='background:#1a1a1a;border-radius:12px;padding:18px 20px;margin-bottom:12px;border-left:3px solid "+da.color+"'><div style='font-size:14px;font-weight:800;color:"+da.color+";margin-bottom:6px'>"+da.title+"</div><div style='font-size:13px;color:#e2e8f0;line-height:1.7'>"+da.body+"</div></div>").join("");
  h+="</div><div class='dv'></div>";
  h+="<div class='sec'><div class='sh'><div class='sn'>14</div><div><div class='st'>Discussion Questions for Your Coach Developer</div><div class='ss'>Use these to open a reflective conversation</div></div></div>";
  h+="<ul class='ql'>"+dqs.map(q=>"<li>"+q.charAt(0).toUpperCase()+q.slice(1)+"</li>").join("")+"</ul></div>";
  h+="<div class='ft'><p>Generated by the <span class='gc'>Constraints Collective</span> Coaching Beliefs Profiler</p><p>"+date+"</p></div></div></body></html>";
  return h;
}

const GAP_LIBRARY={
  "ecological|ecological|aligned":"Your beliefs and practice are strongly aligned around an Ecological orientation. You consistently apply ecological principles in your practice design, feedback, and interactions with athletes.",
  "gamesbased|gamesbased|aligned":"Your beliefs and practice are coherently aligned around a Games-Based approach. You see the game as the primary learning environment and consistently deliver that through modified games, tactical questioning, and athlete problem-solving.",
  "cognitive|cognitive|aligned":"Your beliefs and practice are coherently aligned around a Cognitive orientation. You understand skill as mentally represented and design your coaching through explicit instruction, demonstrations, and scenario-based practice.",
  "behaviourist|behaviourist|aligned":"Your beliefs and practice are coherently aligned around a Behaviourist approach. There is integrity between what you believe and what you do. It is worth reflecting on whether this coherence reflects a settled philosophy or an opportunity to examine assumptions about how athletes learn.",
  "ecological|gamesbased|small":"Your beliefs are strongly Ecological and your practice is close behind in a Games-Based orientation. The next step is refining the ecological specificity of your task design.",
  "ecological|gamesbased|moderate":"Your beliefs lean strongly Ecological but your practice sits closer to a Games-Based approach. This is one of the most common patterns among coaches engaging with Ecological Dynamics. The key move is shifting from designing games that create tactical problems to designing environments that reproduce specific perception-action relationships.",
  "ecological|gamesbased|large":"There is a significant gap between your Ecological beliefs and your Games-Based practice. This often reflects the difference between understanding a framework intellectually and having the task design fluency to implement it.",
  "ecological|cognitive|small":"Your beliefs are Ecological but your practice leans slightly Cognitive. You may still be defaulting to explanation more than a fully ecological approach would suggest.",
  "ecological|cognitive|moderate":"Your beliefs lean Ecological but your practice sits closer to a Cognitive orientation. The challenge is translating ecological beliefs into practice design that creates conditions for athletes to discover solutions rather than be given them.",
  "ecological|cognitive|large":"There is a large gap between your Ecological beliefs and your Cognitive practice. This may reflect institutional expectations, a lack of practical ecological tools, or the difficulty of unlearning deeply ingrained coaching habits.",
  "ecological|behaviourist|small":"Your beliefs are Ecological but your practice shows a modest Behaviourist tendency. The task is finding practical strategies to let your beliefs show up more consistently.",
  "ecological|behaviourist|moderate":"Your beliefs are Ecological but your practice sits in a Behaviourist orientation. This often reflects the difficulty of translating theoretical conviction into practical change.",
  "ecological|behaviourist|large":"Your beliefs are Ecological but your practice remains largely Behaviourist. This often reflects coaching in a context where tradition or norms constrain your ability to coach the way you believe.",
  "gamesbased|ecological|small":"Your beliefs are Games-Based and your practice leans slightly more Ecological. Exploring Ecological Dynamics might give you language to articulate what you are already doing.",
  "gamesbased|ecological|moderate":"Your beliefs are Games-Based but your practice leans more Ecological. Engaging with Ecological Dynamics theory might help consolidate this shift.",
  "gamesbased|ecological|large":"There is a notable gap between your Games-Based beliefs and your Ecological practice. It is worth revisiting your beliefs in light of what your practice is telling you.",
  "gamesbased|cognitive|small":"Your beliefs are Games-Based but your practice leans slightly Cognitive. The temptation to explain what athletes should be thinking is hard to resist even for committed games-based coaches.",
  "gamesbased|cognitive|moderate":"Your beliefs are Games-Based but your practice leans more Cognitive. This gap often narrows as coaches develop greater confidence in game-based task design and questioning.",
  "gamesbased|cognitive|large":"There is a significant gap between your Games-Based beliefs and your Cognitive practice, often reflecting a context that rewards visible teaching over facilitated discovery.",
  "gamesbased|behaviourist|small":"Your beliefs are Games-Based but your practice shows a modest Behaviourist tendency. Worth asking: when do I reach for a drill, and could a modified game achieve the same outcome?",
  "gamesbased|behaviourist|moderate":"Your beliefs are Games-Based but your practice leans Behaviourist. This gap often reflects a confidence issue in trusting that the game will develop the skills you care about.",
  "gamesbased|behaviourist|large":"There is a large gap between your Games-Based beliefs and your Behaviourist practice. Examining the contextual constraints on your practice would be a useful starting point.",
  "cognitive|ecological|small":"Your beliefs are Cognitive but your practice leans slightly Ecological, a productive tension that may be nudging your beliefs in a new direction.",
  "cognitive|ecological|moderate":"Your beliefs are Cognitive but your practice leans more Ecological. Your practice may be ahead of your theoretical framework.",
  "cognitive|ecological|large":"There is a notable gap between your Cognitive beliefs and your Ecological practice. Revisiting your beliefs through the lens of your practice might lead to a meaningful shift.",
  "cognitive|gamesbased|small":"Your beliefs are Cognitive and your practice leans slightly Games-Based. Worth asking: what is the game teaching, and does your explanation align with how you understand learning?",
  "cognitive|gamesbased|moderate":"Your beliefs are primarily Cognitive but your practice is more Games-Based. There may be theoretical tension in how you explain what athletes are learning in game environments.",
  "cognitive|gamesbased|large":"There is a significant gap between your Cognitive beliefs and your Games-Based practice. A broader theoretical lens might better account for the learning you are observing.",
  "cognitive|behaviourist|small":"Your beliefs are Cognitive and your practice leans slightly Behaviourist, possibly reflecting the influence of the environments you coach in.",
  "cognitive|behaviourist|moderate":"Your beliefs are Cognitive but your practice leans Behaviourist. It is worth reflecting on whether your practice is creating the cognitive engagement your beliefs suggest is necessary.",
  "cognitive|behaviourist|large":"There is a significant gap between your Cognitive beliefs and your Behaviourist practice. Your beliefs suggest athletes need to understand and problem-solve; your practice may not be providing the conditions for that.",
  "behaviourist|cognitive|small":"Your beliefs are primarily Behaviourist but your practice shows a modest Cognitive tendency, possibly reflecting exposure to cognitive approaches beginning to shift your practice.",
  "behaviourist|cognitive|moderate":"Your beliefs are Behaviourist but your practice leans Cognitive. This may reflect a coaching education pathway that has introduced cognitive ideas without yet challenging your underlying beliefs.",
  "behaviourist|cognitive|large":"There is a significant gap between your Behaviourist beliefs and your Cognitive practice. It is worth reflecting on which account of learning better explains what you observe.",
  "behaviourist|gamesbased|small":"Your beliefs lean Behaviourist but your practice shows a modest Games-Based tendency, often the beginning of a productive journey.",
  "behaviourist|gamesbased|moderate":"Your beliefs lean Behaviourist but your practice sits closer to Games-Based. It is worth reflecting on whether your practice is shifting your beliefs, or whether there is a persistent disconnect.",
  "behaviourist|gamesbased|large":"There is a large gap between your Behaviourist beliefs and your Games-Based practice. Bringing them into alignment would likely strengthen both your coaching and your ability to justify your decisions.",
  "behaviourist|ecological|small":"Your beliefs are primarily Behaviourist but your practice shows a modest Ecological tendency. If you are finding ecological methods effective, it may be worth exploring the theory behind them.",
  "behaviourist|ecological|moderate":"Your beliefs are primarily Behaviourist but your practice leans Ecological. Connecting the practice you are using to its theoretical framework would likely strengthen both.",
  "behaviourist|ecological|large":"There is a significant gap between your Behaviourist beliefs and your Ecological practice, the largest theoretical distance possible in this framework. Are your beliefs actually more traditional than your experience of coaching suggests?",
  "balanced|balanced|aligned":"Your profile is balanced across all four orientations in both beliefs and practice. The reflective question is whether this balance represents a coherent, intentional philosophy or a collection of methods not yet examined against a unifying set of beliefs.",
  "default":"Your belief and practice profiles show a distinctive pattern. The relationship between how you see skill learning and how you deliver your coaching is worth exploring.",
};

function getGapLevel(d){if(d<0.08)return"aligned";if(d<0.2)return"small";if(d<0.35)return"moderate";return"large";}
function generateInterp(bN,pN){
  const bV=Object.values(bN),pV=Object.values(pN);
  if(Math.max(...bV)-Math.min(...bV)<0.15&&Math.max(...pV)-Math.min(...pV)<0.15)return GAP_LIBRARY["balanced|balanced|aligned"];
  const bD=Object.entries(bN).sort((a,b)=>b[1]-a[1])[0][0];
  const pD=Object.entries(pN).sort((a,b)=>b[1]-a[1])[0][0];
  const g=KEYS.reduce((acc,k)=>acc+Math.abs((bN[k]||0)-(pN[k]||0)),0)/KEYS.length;
  return GAP_LIBRARY[bD+"|"+pD+"|"+getGapLevel(g)]||GAP_LIBRARY[bD+"|"+pD+"|moderate"]||GAP_LIBRARY[bD+"|"+bD+"|aligned"]||GAP_LIBRARY["default"];
}

const PROFILES={
  ecological:{label:"Ecological / Constraints-Led",color:"#22c55e",summary:"Your coaching beliefs align strongly with Ecological Dynamics and Constraints-Led Approaches. You see skill as emerging from the athlete-environment relationship, view variability as functional, and understand that perception and action are inseparable.",bullets:["Skill emerges from athlete-environment interaction","Movement variability is a resource, not an error","Practice should be representative of performance","Constraints shape learning more than instructions","Perception, action, and cognition are inseparable"]},
  gamesbased:{label:"Games-Based / Tactical",color:"#f59e0b",summary:"Your coaching beliefs align strongly with Games-Based approaches. You see the game as the primary driver of learning and favour tactical understanding developed through play.",bullets:["The game is the primary learning environment","Tactical understanding is central to skill development","Modified games and conditioned tasks are core tools","Questioning develops athlete decision-making","Athlete problem-solving valued over prescribed technique"]},
  cognitive:{label:"Cognitive / Information Processing",color:"#3b82f6",summary:"Your coaching beliefs align with Cognitive and Information Processing views. You see skill as a mental representation that guides movement, and learning as the development and refinement of those representations.",bullets:["Skill is a mental representation that guides movement","Learning involves building and refining cognitive models","Decision-making and tactical awareness are central","Explicit instruction and demonstrations are important","The mind directs the body"]},
  behaviourist:{label:"Behaviourist / Traditional",color:"#ef4444",summary:"Your coaching beliefs align with Behaviourist and Traditional approaches. You see correct technique as the foundation of skilled performance and believe that repetition and reinforcement are the engines of learning.",bullets:["Correct technique is the foundation of skilled performance","Repetition and reinforcement drive learning","Errors should be corrected immediately","Part-to-whole skill progression is effective","The coach specifies and the athlete executes"]},
};



function SpectrumQuestion({question,onComplete,isLast}){
  const trackRef=useRef(null);
  const dragRef=useRef(null);
  const [pos,setPos]=useState({A:15,B:38,C:62,D:85});
  const qData = Q_PLAIN[question.id - 1];
  const shuffled=shuffleWithSeed(qData.opts,qData.id*37+7);
  const lmap={};shuffled.forEach((o,i)=>{lmap[LETTERS[i]]=o.id;});
  useEffect(()=>{
    setPos({A:15,B:38,C:62,D:85});
  },[question.id]);
  useEffect(()=>{
    const gp=cx=>{const r=trackRef.current?.getBoundingClientRect();if(!r)return 0;return clamp((cx-r.left)/r.width*100,0,100);};
    const mm=e=>{if(!dragRef.current)return;setPos(p=>({...p,[dragRef.current]:gp(e.clientX)}));};
    const tm=e=>{if(!dragRef.current)return;e.preventDefault();setPos(p=>({...p,[dragRef.current]:gp(e.touches[0].clientX)}));};
    const up=()=>{dragRef.current=null;};
    window.addEventListener("mousemove",mm);window.addEventListener("mouseup",up);
    window.addEventListener("touchmove",tm,{passive:false});window.addEventListener("touchend",up);
    return()=>{window.removeEventListener("mousemove",mm);window.removeEventListener("mouseup",up);window.removeEventListener("touchmove",tm);window.removeEventListener("touchend",up);};
  },[]);
  const done=()=>{const m={};LETTERS.forEach(l=>{m[lmap[l]]=pos[l];});onComplete(m);};
  return(
    <div style={{userSelect:"none"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:32}}>
        {shuffled.map((o,i)=>(
          <div key={o.id} style={{background:"#1e293b",border:"2px solid #334155",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:10,fontWeight:700,color:T.muted,marginBottom:4}}>Statement {LETTERS[i]}</div>
            <div style={{fontSize:12,color:T.primary,lineHeight:1.55}}>{o.text}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.secondary,marginBottom:8}}>
        <span>Not like my view</span><span>Very like my view</span>
      </div>
      <div ref={trackRef} style={{position:"relative",height:6,background:"#334155",borderRadius:6,margin:"42px 0 54px"}}>
        {[0,25,50,75,100].map(t=><div key={t} style={{position:"absolute",left:t+"%",top:-6,width:1,height:18,background:"#475569"}}/>)}
        {LETTERS.map(l=>(
          <div key={l} onMouseDown={e=>{e.preventDefault();dragRef.current=l;}} onTouchStart={()=>{dragRef.current=l;}}
            style={{position:"absolute",left:pos[l]+"%",top:"50%",transform:"translate(-50%,-50%)",cursor:"grab",zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",touchAction:"none"}}>
            <div style={{position:"absolute",bottom:28,background:"#1e293b",border:"1px solid #475569",color:T.primary,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:4,pointerEvents:"none"}}>{l}</div>
            <div style={{width:24,height:24,borderRadius:"50%",background:NEUTRAL,border:"3px solid #0f172a",boxShadow:"0 0 0 2px "+NEUTRAL}}/>
            <div style={{position:"absolute",top:28,fontSize:10,color:T.secondary,fontWeight:600,pointerEvents:"none"}}>{Math.round(pos[l])}</div>
          </div>
        ))}
      </div>
      <button onClick={done} style={{width:"100%",background:"linear-gradient(135deg,#a8e063,#7ab83a)",color:"#0a0a0a",border:"none",borderRadius:10,padding:"13px",fontSize:15,fontWeight:800,cursor:"pointer"}}>
        {isLast?"See My Profile →":"Next →"}
      </button>
    </div>
  );
}

function Petal({scores,dominant,size=220}){
  const cx=size/2,cy=size/2,maxR=size*0.32,minR=size*0.05;
  const OS=[{key:"ecological",label:"Ecological",color:"#22c55e",dark:"#15803d",angle:45},{key:"gamesbased",label:"Games-based",color:"#f59e0b",dark:"#b45309",angle:135},{key:"behaviourist",label:"Behaviourist",color:"#ef4444",dark:"#b91c1c",angle:225},{key:"cognitive",label:"Cognitive",color:"#3b82f6",dark:"#1d4ed8",angle:315}];
  return(
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{maxWidth:size,display:"block",margin:"0 auto"}}>
      <defs>{OS.map(q=><radialGradient key={q.key} id={`pg-${q.key}-${size}`} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={q.color}/><stop offset="100%" stopColor={q.dark} stopOpacity="0.8"/></radialGradient>)}<filter id={`sh-${size}`}><feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#000" floodOpacity="0.4"/></filter></defs>
      <line x1={cx} y1={size*0.08} x2={cx} y2={size*0.92} stroke="#1e293b" strokeWidth="1.5"/>
      <line x1={size*0.08} y1={cy} x2={size*0.92} y2={cy} stroke="#1e293b" strokeWidth="1.5"/>
      {OS.map(q=>{const s=Math.max(0.07,scores[q.key]||0);const ry=minR+s*(maxR-minR),rx=ry*0.52;const rad=q.angle*Math.PI/180;const ox=cx+Math.cos(rad)*ry*0.5,oy=cy-Math.sin(rad)*ry*0.5;const lx=cx+Math.cos(rad)*(maxR+size*0.11),ly=cy-Math.sin(rad)*(maxR+size*0.11);return(<g key={q.key}><ellipse cx={ox} cy={oy} rx={rx} ry={ry} fill={`url(#pg-${q.key}-${size})`} filter={`url(#sh-${size})`} opacity={dominant===q.key?1:0.5} transform={`rotate(${-q.angle+90},${ox},${oy})`}/><text x={lx} y={ly} textAnchor="middle" fill={dominant===q.key?q.color:"#94a3b8"} fontSize="7.5" fontWeight={dominant===q.key?"700":"400"}>{q.label}</text></g>);})}
      <circle cx={cx} cy={cy} r={size*0.05} fill="#0f172a" stroke="#334155" strokeWidth="1.5"/>
    </svg>
  );
}


// ── Team profile generator ────────────────────────────────────────────────
function computeTeamResults(submissions) {
  const avg = arr => arr.reduce((a,b)=>a+b,0)/arr.length;
  const allBR = {ecological:[],gamesbased:[],cognitive:[],behaviourist:[]};
  const allPR = {ecological:[],gamesbased:[],cognitive:[],behaviourist:[]};
  submissions.forEach(s => {
    const r = s.results;
    KEYS.forEach(k => {
      allBR[k].push(r.bR[k]||0);
      allPR[k].push(r.pR[k]||0);
    });
  });
  const bR = {}, pR = {};
  KEYS.forEach(k => { bR[k]=avg(allBR[k]); pR[k]=avg(allPR[k]); });
  const norm = obj => { const m=Math.max(...Object.values(obj),0.001); return Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,v/m])); };
  const bN=norm(bR), pN=norm(pR);
  const bDom=Object.entries(bN).sort((a,b)=>b[1]-a[1])[0][0];
  const pDom=Object.entries(pN).sort((a,b)=>b[1]-a[1])[0][0];
  // Spread analysis - standard deviation per orientation
  const spread = {};
  KEYS.forEach(k => {
    const vals = submissions.map(s=>s.results.bR[k]||0);
    const mean = avg(vals);
    const sd = Math.sqrt(vals.map(v=>(v-mean)**2).reduce((a,b)=>a+b,0)/vals.length);
    spread[k] = sd;
  });
  // Individual dominant beliefs for mismatch analysis
  const individualBDoms = submissions.map(s => {
    const bN2 = norm(s.results.bR);
    return Object.entries(bN2).sort((a,b)=>b[1]-a[1])[0][0];
  });
  const individualPDoms = submissions.map(s => {
    const pN2 = norm(s.results.pR);
    return Object.entries(pN2).sort((a,b)=>b[1]-a[1])[0][0];
  });
  const beliefSpread = new Set(individualBDoms).size;
  const practiceSpread = new Set(individualPDoms).size;
  return { bR, pR, bN, pN, bDom, pDom, spread, beliefSpread, practiceSpread, individualBDoms, individualPDoms, n: submissions.length };
}

function makeTeamReport(data) {
  const { teamCode, teamName, submissions, tr } = data;
  const { bR, pR, bN, pN, bDom, pDom, spread, beliefSpread, practiceSpread, individualBDoms, individualPDoms, n } = tr;
  const C={ecological:"#22c55e",gamesbased:"#f59e0b",cognitive:"#3b82f6",behaviourist:"#ef4444"};
  const LB={ecological:"Ecological / CLA",gamesbased:"Games-based",cognitive:"Cognitive",behaviourist:"Behaviourist"};
  const KS=["ecological","gamesbased","cognitive","behaviourist"];
  const date=new Date().toLocaleDateString("en-AU",{day:"numeric",month:"long",year:"numeric"});
  const aligned = bDom===pDom;

  // Count how many coaches dominant in each orientation
  const beliefCounts = {};
  const practiceCounts = {};
  KS.forEach(k=>{ beliefCounts[k]=0; practiceCounts[k]=0; });
  individualBDoms.forEach(d=>beliefCounts[d]++);
  individualPDoms.forEach(d=>practiceCounts[d]++);

  // Coherence score - lower spread = more coherent
  const avgSpread = Object.values(spread).reduce((a,b)=>a+b,0)/4;
  const coherenceLevel = avgSpread < 0.08 ? "high" : avgSpread < 0.16 ? "moderate" : "low";
  const coherenceColor = coherenceLevel==="high"?"#22c55e":coherenceLevel==="moderate"?"#f59e0b":"#ef4444";

  // Mismatch narrative
  const mismatches = submissions.filter(s=>{
    const bN2={}; const pN2={};
    KEYS.forEach(k=>{bN2[k]=s.results.bR[k]||0; pN2[k]=s.results.pR[k]||0;});
    const bm=Object.entries(bN2).sort((a,b)=>b[1]-a[1])[0][0];
    const pm=Object.entries(pN2).sort((a,b)=>b[1]-a[1])[0][0];
    return bm!==pm;
  }).length;

  const bSVG=makePetalSVG(bN,bDom,210);
  const pSVG=makePetalSVG(pN,pDom,210);

  // Narrative based on coherence
  let coherenceNarrative = "";
  if(coherenceLevel==="high") {
    coherenceNarrative = `This coaching group shows strong alignment in how they think about skill learning. Coaches share a common theoretical orientation, which means athletes are likely receiving consistent messages, experiencing consistent practice design, and being held to consistent standards across all staff interactions. This is a significant organisational strength.`;
  } else if(coherenceLevel==="moderate") {
    coherenceNarrative = `This coaching group shows moderate alignment. There is a shared general direction, but meaningful differences exist in how individual coaches think about skill learning. Athletes may be receiving somewhat different messages depending on which coach they are working with. Clarifying a shared methodology would strengthen the collective impact of this group.`;
  } else {
    coherenceNarrative = `This coaching group shows significant fragmentation in beliefs about skill learning. Coaches hold substantially different views about what a skill is, how learning happens, and what good practice looks like. This is not a sign of healthy diversity — it means athletes are likely receiving inconsistent messages, experiencing different practice philosophies, and being coached toward different standards depending on who they are with. This is a performance risk that warrants direct attention from the head coach or performance director.`;
  }

  // Belief spread narrative
  let spreadNarrative = "";
  if(beliefSpread===1) {
    spreadNarrative = `All ${n} coaches in this group share the same dominant belief orientation — ${LB[bDom]}. This level of theoretical coherence is unusual and reflects either a strongly shared coaching culture or a group that has invested seriously in developing a common philosophy.`;
  } else if(beliefSpread===2) {
    const dominated = KS.filter(k=>beliefCounts[k]>0).map(k=>`${beliefCounts[k]} coach${beliefCounts[k]>1?'es':''} lean ${LB[k]}`).join(' and ');
    spreadNarrative = `Across the group, beliefs are spread across two orientations: ${dominated}. This represents a meaningful philosophical divide that is worth surfacing and discussing openly as a staff group.`;
  } else {
    spreadNarrative = `Beliefs across this group span ${beliefSpread} different orientations. This level of fragmentation means there is currently no shared theoretical foundation for how this coaching group thinks about skill learning and athlete development.`;
  }

  // Individual mismatch narrative
  let mismatchNarrative = mismatches > 0
    ? `${mismatches} of the ${n} coaches in this group show a gap between their beliefs and their practice — meaning what they believe about learning is not fully reflected in how they coach. This is common, but when it occurs across multiple staff members it amplifies the inconsistency athletes experience.`
    : `All coaches in this group show alignment between their beliefs and their practice — what they believe about learning is broadly reflected in how they coach.`;

  function sbar(k,v){return `<div style='margin-bottom:10px'><div style='display:flex;justify-content:space-between;margin-bottom:3px'><span style='font-size:11px;font-weight:700;color:${C[k]}'>${LB[k]}</span><span style='font-size:10px;color:#cbd5e1'>${Math.round(v*100)}%</span></div><div style='background:#111;border-radius:4px;height:7px'><div style='background:${C[k]};border-radius:4px;height:7px;width:${Math.round(v*100)}%;opacity:0.9'></div></div></div>`;}

  function spreadBar(k,v,b){
    const spreadPct = Math.round(v*100);
    return `<div style='margin-bottom:14px'>
      <div style='display:flex;justify-content:space-between;margin-bottom:4px'>
        <span style='font-size:12px;font-weight:700;color:${C[k]}'>${LB[k]}</span>
        <span style='font-size:10px;color:${spreadPct>15?"#ef4444":spreadPct>8?"#f59e0b":"#22c55e"};font-weight:700'>${spreadPct>15?"High variation":spreadPct>8?"Some variation":"Consistent"}</span>
      </div>
      <div style='font-size:9px;color:#cbd5e1;margin-bottom:2px'>Group average</div>
      <div style='background:#111;border-radius:4px;height:7px;margin-bottom:3px'><div style='background:${C[k]};border-radius:4px;height:7px;width:${Math.round(b*100)}%;opacity:0.9'></div></div>
      <div style='font-size:9px;color:#94a3b8;margin-bottom:2px'>Variation within group</div>
      <div style='background:#111;border-radius:4px;height:5px'><div style='background:${C[k]};border-radius:4px;height:5px;width:${Math.min(spreadPct*3,100)}%;opacity:0.4'></div></div>
    </div>`;
  }

  const css="*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#e2e8f0;line-height:1.65}.wrap{max-width:820px;margin:0 auto;padding:32px 32px 60px}.cover{background:#1a1a1a;border-radius:16px;padding:44px 40px;margin-bottom:36px;position:relative;overflow:hidden}.ct{position:absolute;top:0;left:0;right:0;height:4px;background:#a8e063}.sh{display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #222}.sn{width:28px;height:28px;border-radius:8px;background:#a8e063;color:#0a0a0a;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0}.st{font-size:17px;font-weight:800;color:#fff}.ss{font-size:12px;color:#cbd5e1}.sec{margin-bottom:32px}.card{background:#1a1a1a;border-radius:12px;padding:18px 22px;margin-bottom:12px}.cl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#a8e063;margin-bottom:8px}.card p{font-size:13px;color:#e2e8f0;line-height:1.75}.pr{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px}.pb{background:#1a1a1a;border-radius:14px;padding:18px 12px;text-align:center}.pl{font-size:10px;font-weight:700;color:#cbd5e1;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}.pn{font-size:12px;font-weight:700;margin-top:8px}.sr{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}.dv{height:1px;background:#222;margin:28px 0}.ql{list-style:none}.ql li{padding:13px 16px;background:#1a1a1a;border-radius:10px;margin-bottom:10px;font-size:13px;color:#e2e8f0;line-height:1.65;border-left:3px solid #a8e063}.ft{margin-top:44px;padding-top:22px;border-top:1px solid #222;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px}.ft p{font-size:11px;color:#94a3b8}.gc{color:#a8e063;font-weight:700}";

  let h = `<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'/><title>Team Coaching Beliefs Profile${teamName?" - "+teamName:""}</title><style>${css}</style></head><body><div class='wrap'>`;

  // Cover
  h+=`<div class='cover'><div class='ct'></div>
  <div style='display:flex;align-items:center;gap:14px;margin-bottom:28px'>
    <svg xmlns='http://www.w3.org/2000/svg' width='46' height='46' viewBox='0 0 100 100'><text x='4' y='70' font-family='Georgia,serif' font-style='italic' font-weight='900' font-size='72' fill='white'>cc</text><line x1='6' y1='84' x2='70' y2='84' stroke='#a8e063' stroke-width='6' stroke-linecap='round'/></svg>
    <div><div style='font-size:10px;font-weight:800;color:#a8e063;letter-spacing:3px;text-transform:uppercase'>Constraints</div><div style='font-size:10px;font-weight:800;color:#fff;letter-spacing:3px;text-transform:uppercase'>Collective</div></div>
  </div>
  <div style='font-size:26px;font-weight:900;color:#fff;margin-bottom:4px'>Team Coaching Beliefs Profile</div>
  <div style='font-size:12px;color:#a8e063;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:24px'>Group Profile</div>
  <div style='display:flex;gap:28px;flex-wrap:wrap;margin-bottom:18px'>
    <div><div style='font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#cbd5e1;margin-bottom:3px'>Team</div><div style='font-size:15px;font-weight:700;color:#fff'>${teamName||teamCode}</div></div>
    <div><div style='font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#cbd5e1;margin-bottom:3px'>Date</div><div style='font-size:15px;font-weight:700;color:#fff'>${date}</div></div>
    <div><div style='font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#cbd5e1;margin-bottom:3px'>Coaches profiled</div><div style='font-size:15px;font-weight:700;color:#fff'>${n}</div></div>
  </div>
  <div style='background:#1e293b;border-radius:10px;padding:12px 16px;border-left:3px solid #a8e063'>
    <p style='font-size:13px;color:#e2e8f0;line-height:1.7;margin:0'>This profile explored the relationship between this group's collective beliefs about skill learning and how those beliefs show up in their coaching practice.</p>
  </div></div>`;

  // Section 1 - Coherence overview
  h+=`<div class='sec'><div class='sh'><div class='sn'>1</div><div><div class='st'>Group Coherence</div><div class='ss'>How aligned is this coaching group in their beliefs and practice?</div></div></div>`;
  h+=`<div style='background:#1a1a1a;border-radius:12px;padding:20px;margin-bottom:12px;border-left:4px solid ${coherenceColor}'>
    <div style='display:flex;align-items:center;gap:10px;margin-bottom:10px'>
      <span style='font-size:14px;font-weight:800;color:${coherenceColor}'>Coherence: ${coherenceLevel.charAt(0).toUpperCase()+coherenceLevel.slice(1)}</span>
      <span style='font-size:11px;color:#94a3b8'>${n} coaches profiled</span>
    </div>
    <p style='font-size:13px;color:#e2e8f0;line-height:1.75;margin:0'>${coherenceNarrative}</p>
  </div>`;
  h+=`<div style='background:#1a1a1a;border-radius:12px;padding:18px 20px;margin-bottom:12px'>
    <div style='font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#a8e063;margin-bottom:10px'>Belief Spread Across Orientations</div>
    <p style='font-size:13px;color:#e2e8f0;line-height:1.75;margin-bottom:14px'>${spreadNarrative}</p>
    <div style='display:grid;grid-template-columns:1fr 1fr;gap:8px'>
      ${KS.filter(k=>beliefCounts[k]>0).map(k=>`<div style='background:#0f172a;border-radius:8px;padding:10px 12px;border-left:3px solid ${C[k]}'><div style='font-size:11px;font-weight:700;color:${C[k]};margin-bottom:2px'>${LB[k]}</div><div style='font-size:13px;color:#f8fafc;font-weight:800'>${beliefCounts[k]} coach${beliefCounts[k]>1?'es':''}</div></div>`).join('')}
    </div>
  </div>`;
  h+=`<div style='background:#1a1a1a;border-radius:12px;padding:18px 20px;margin-bottom:12px'>
    <div style='font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#a8e063;margin-bottom:10px'>Individual Beliefs-Practice Gaps</div>
    <p style='font-size:13px;color:#e2e8f0;line-height:1.75;margin:0'>${mismatchNarrative}</p>
  </div></div><div class='dv'></div>`;

  // Section 2 - Team petal diagrams
  h+=`<div class='sec'><div class='sh'><div class='sn'>2</div><div><div class='st'>Group Belief and Practice Profile</div><div class='ss'>The collective orientation of this coaching group</div></div></div>`;
  h+=`<p style='font-size:13px;color:#cbd5e1;line-height:1.75;margin-bottom:18px'>The diagrams below show the aggregate shape of this group's beliefs and practice. The larger each petal, the more strongly the group as a whole scored toward that orientation.</p>`;
  h+=`<div class='pr'><div class='pb'><div class='pl'>How We See It — Group Beliefs</div>${bSVG}<div class='pn' style='color:${C[bDom]}'>${LB[bDom]}</div></div><div class='pb'><div class='pl'>How We Do It — Group Practice</div>${pSVG}<div class='pn' style='color:${C[pDom]}'>${LB[pDom]}</div></div></div>`;
  h+=`<div class='sr'><div class='card'><div class='cl'>Group Belief Scores</div>${KS.map(k=>sbar(k,bR[k]||0)).join('')}</div><div class='card'><div class='cl'>Group Practice Scores</div>${KS.map(k=>sbar(k,pR[k]||0)).join('')}</div></div></div><div class='dv'></div>`;

  // Section 3 - Variation within group
  h+=`<div class='sec'><div class='sh'><div class='sn'>3</div><div><div class='st'>Variation Within the Group</div><div class='ss'>Where coaches are consistent and where views diverge</div></div></div>`;
  h+=`<p style='font-size:13px;color:#cbd5e1;line-height:1.75;margin-bottom:18px'>The bars below show the group average for each orientation and the degree of variation within the group. High variation means coaches hold meaningfully different views on that dimension.</p>`;
  h+=KS.map(k=>spreadBar(k,spread[k],bR[k])).join('');
  h+=`</div><div class='dv'></div>`;

  // Section 4 - What this means
  h+=`<div class='sec'><div class='sh'><div class='sn'>4</div><div><div class='st'>What This Means for Athlete Development</div><div class='ss'>The practical implications of this group's profile</div></div></div>`;
  h+=`<div class='card'><div class='cl'>The core issue</div><p>When a coaching group holds different beliefs about how athletes learn, those differences show up every day — in how practice is designed, what feedback is given, what counts as good performance, and what coaches say to athletes in difficult moments. Athletes do not experience a coaching philosophy. They experience individual coaches, and they notice when the messages are inconsistent.</p></div>`;
  
  if(coherenceLevel==="low") {
    h+=`<div style='background:#1a1a1a;border-radius:12px;padding:18px 20px;margin-bottom:12px;border-left:3px solid #ef4444'><div style='font-size:14px;font-weight:800;color:#ef4444;margin-bottom:6px'>Priority: Establish a Shared Methodology</div><div style='font-size:13px;color:#e2e8f0;line-height:1.7'>The degree of fragmentation in this group's beliefs makes establishing a shared department methodology an urgent priority. This does not mean eliminating individual coaching styles — it means agreeing on the underlying principles about how athletes learn that will guide all coaching decisions across the group.</div></div>`;
  } else if(coherenceLevel==="moderate") {
    h+=`<div style='background:#1a1a1a;border-radius:12px;padding:18px 20px;margin-bottom:12px;border-left:3px solid #f59e0b'><div style='font-size:14px;font-weight:800;color:#f59e0b;margin-bottom:6px'>Opportunity: Clarify and Consolidate</div><div style='font-size:13px;color:#e2e8f0;line-height:1.7'>This group has a shared general direction but meaningful individual differences remain. The opportunity is to surface those differences through structured professional conversations and work toward a more explicit shared methodology that guides practice design and athlete interaction across the department.</div></div>`;
  } else {
    h+=`<div style='background:#1a1a1a;border-radius:12px;padding:18px 20px;margin-bottom:12px;border-left:3px solid #22c55e'><div style='font-size:14px;font-weight:800;color:#22c55e;margin-bottom:6px'>Strength: Build on Shared Foundation</div><div style='font-size:13px;color:#e2e8f0;line-height:1.7'>This group's high coherence is a significant organisational asset. The next step is making this shared philosophy explicit — articulating it clearly so it can guide recruitment, induction, practice design standards, and athlete communication across the department.</div></div>`;
  }
  h+=`</div><div class='dv'></div>`;

  // Section 5 - Discussion questions for performance director
  const teamDqs = [
    "Looking at this profile, does the group's dominant orientation reflect a deliberate decision or has it emerged without explicit discussion?",
    beliefSpread>1 ? `This group spans ${beliefSpread} different belief orientations. Has this diversity ever been named and discussed openly, or has it operated below the surface?` : "This group shows strong theoretical alignment. Is this the result of deliberate culture-building, and how is it maintained through recruitment and induction?",
    "If you asked each coach to describe what a skill is and how athletes learn, how different would the answers be? Does this profile suggest those differences are larger or smaller than you expected?",
    "What messages are athletes currently receiving from different members of this coaching group about what good performance looks like and how to achieve it? Are those messages consistent?",
    coherenceLevel!=="high" ? "What would it take for this group to develop and commit to a shared department methodology — not a uniform coaching style, but a common set of beliefs about learning that guides all coaching decisions?" : "How is the shared methodology of this group communicated to new staff, athletes, and parents? Is it explicit enough to survive staff changes?",
    "Which coach in this group is furthest from the group average? What does that mean for the athletes who work primarily with that coach?",
    "If you repeated this profiling process in 12 months, what would you want to be different about this group's profile?",
  ];
  h+=`<div class='sec'><div class='sh'><div class='sn'>5</div><div><div class='st'>Discussion Questions for the Performance Director</div><div class='ss'>Use these to open a structured conversation with your coaching group</div></div></div>`;
  h+=`<ul class='ql'>${teamDqs.map(q=>`<li>${q}</li>`).join('')}</ul></div>`;

  h+=`<div class='ft'><p>Generated by the <span class='gc'>Constraints Collective</span> Coaching Beliefs Profiler</p><p>${date} · Team code: ${teamCode}</p></div></div></body></html>`;
  return h;
}

export default function App(){
  const [step,setStep]=useState(0);
  const [name,setName]=useState("");
  const [ans,setAns]=useState({});
  const [reportHTML,setReportHTML]=useState(null);
  const [teamCode,setTeamCode]=useState("");
  const [teamName,setTeamName]=useState("");
  const [teamSubmitting,setTeamSubmitting]=useState(false);
  const [teamSubmitted,setTeamSubmitted]=useState(false);
  const [teamError,setTeamError]=useState("");
  const [teamProfileHTML,setTeamProfileHTML]=useState(null);
  const [teamLoading,setTeamLoading]=useState(false);
  const [viewMode,setViewMode]=useState("home"); // "home" | "team-admin"

  const isBreak=step===10.5,isResults=step===21;
  const currentQ=(!isBreak&&!isResults&&step>=1&&step<=20)?Q[step-1]:null;

  const handleComplete=positions=>{
    const newAns={...ans,[currentQ.id]:positions};
    setAns(newAns);
    if(currentQ.id===10){setStep(10.5);return;}
    if(currentQ.id===20){setStep(21);return;}
    setStep(s=>s+1);
  };

  const computeResults=()=>{
    const avg=arr=>arr.reduce((a,b)=>a+b,0)/arr.length;
    const secAvg=(sec,school)=>{
      const vals=Q.filter(q=>q.s===sec).map(q=>{const p=ans[q.id];const o=q.opts.find(o=>o.school===SCHOOL_MAP[school]);return p&&o?(p[o.id]||0)/100:0;});
      return avg(vals);
    };
    const bR={},pR={};KEYS.forEach(k=>{bR[k]=secAvg(1,k);pR[k]=secAvg(2,k);});
    const norm=obj=>{const m=Math.max(...Object.values(obj),0.001);return Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,v/m]));};
    const bN=norm(bR),pN=norm(pR);
    const bDom=Object.entries(bN).sort((a,b)=>b[1]-a[1])[0][0];
    const pDom=Object.entries(pN).sort((a,b)=>b[1]-a[1])[0][0];
    return{bR,pR,bN,pN,bDom,pDom,interp:generateInterp(bN,pN)};
  };

  const openReport=()=>{
    const r=computeResults();
    setReportHTML(makeReport({name,bRaw:r.bR,pRaw:r.pR,bNorm:r.bN,pNorm:r.pN,bDom:r.bDom,pDom:r.pDom,interp:r.interp}));
  };

  const submitToTeam=async()=>{
    if(!teamCode.trim()){setTeamError("Please enter a team code.");return;}
    setTeamSubmitting(true);setTeamError("");
    const r=computeResults();
    const ok=await saveSubmission(teamCode,name,{bR:r.bR,pR:r.pR,bN:r.bN,pN:r.pN,bDom:r.bDom,pDom:r.pDom});
    setTeamSubmitting(false);
    if(ok){setTeamSubmitted(true);}
    else{setTeamError("Could not save — please try again. If the problem persists, contact Ian.");}
  };

  const generateTeamProfile=async()=>{
    if(!teamCode.trim()){setTeamError("Please enter a team code.");return;}
    setTeamLoading(true);setTeamError("");
    const subs=await fetchTeamSubmissions(teamCode);
    setTeamLoading(false);
    if(!subs||subs.length===0){setTeamError("No submissions found for that team code.");return;}
    const tr=computeTeamResults(subs);
    setTeamProfileHTML(makeTeamReport({teamCode:teamCode.toUpperCase(),teamName,submissions:subs,tr}));
  };

  const pct=(Object.keys(ans).length/20)*100;
  const qNum=currentQ?(currentQ.s===1?currentQ.id:currentQ.id-10):0;

  // ── Team profile view ────────────────────────────────────────────────────
  if(teamProfileHTML) return(
    <div>
      <div style={{background:"#1e293b",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <div style={{fontSize:13,color:"#a8e063",fontFamily:"system-ui,sans-serif",fontWeight:600}}>
          To save as PDF: <span style={{color:T.primary,fontWeight:400}}>press Cmd+P then choose Save as PDF</span>
        </div>
        <button onClick={()=>setTeamProfileHTML(null)} style={{background:"#a8e063",color:"#000",border:"none",borderRadius:6,padding:"7px 16px",fontSize:13,fontWeight:800,cursor:"pointer"}}>
          ← Back
        </button>
      </div>
      <div dangerouslySetInnerHTML={{__html:teamProfileHTML}}/>
    </div>
  );

  // ── Report view ─────────────────────────────────────────────────────────
  if(reportHTML) return(
    <div>
      <div style={{background:"#1e293b",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <div style={{fontSize:13,color:"#a8e063",fontFamily:"system-ui,sans-serif",fontWeight:600}}>
          To save as PDF: <span style={{color:T.primary,fontWeight:400}}>press Cmd+P then choose Save as PDF</span>
        </div>
        <button onClick={()=>setReportHTML(null)} style={{background:"#a8e063",color:"#000",border:"none",borderRadius:6,padding:"7px 16px",fontSize:13,fontWeight:800,cursor:"pointer"}}>
          ← Back
        </button>
      </div>
      <div dangerouslySetInnerHTML={{__html:reportHTML}}/>
    </div>
  );

  // ── Team admin view ───────────────────────────────────────────────────────
  if(viewMode==="team-admin") return(
    <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"system-ui,sans-serif"}}>
      <div style={{maxWidth:480,width:"100%",color:T.primary}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:28}}>
          <svg width="36" height="36" viewBox="0 0 100 100"><text x="4" y="70" fontFamily="Georgia,serif" fontStyle="italic" fontWeight="900" fontSize="72" fill="white">cc</text><line x1="6" y1="84" x2="70" y2="84" stroke="#a8e063" strokeWidth="6" strokeLinecap="round"/></svg>
          <div style={{lineHeight:1.2}}><div style={{fontSize:9,fontWeight:800,color:"#a8e063",letterSpacing:"3px",textTransform:"uppercase"}}>Constraints</div><div style={{fontSize:9,fontWeight:800,color:T.primary,letterSpacing:"3px",textTransform:"uppercase"}}>Collective</div></div>
        </div>
        <h2 style={{fontSize:22,fontWeight:900,marginBottom:6,color:T.primary}}>Generate Team Profile</h2>
        <p style={{fontSize:14,color:T.body,lineHeight:1.75,marginBottom:28}}>Enter the team code to pull all submissions and generate the group profile.</p>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Team Code</label>
          <input value={teamCode} onChange={e=>setTeamCode(e.target.value)} placeholder="e.g. HAWKS2025" style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"11px 16px",color:T.primary,fontSize:14,boxSizing:"border-box",outline:"none",textTransform:"uppercase"}}/>
        </div>
        <div style={{marginBottom:24}}>
          <label style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Team Name (optional)</label>
          <input value={teamName} onChange={e=>setTeamName(e.target.value)} placeholder="e.g. Hawthorn Football Club" style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"11px 16px",color:T.primary,fontSize:14,boxSizing:"border-box",outline:"none"}}/>
        </div>
        {teamError&&<div style={{background:"#ef444422",border:"1px solid #ef4444",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#ef4444",marginBottom:14}}>{teamError}</div>}
        <button onClick={generateTeamProfile} disabled={teamLoading} style={{width:"100%",background:"linear-gradient(135deg,#a8e063,#7ab83a)",color:"#0a0a0a",border:"none",borderRadius:10,padding:"13px",fontSize:15,fontWeight:800,cursor:"pointer",marginBottom:12,opacity:teamLoading?0.7:1}}>
          {teamLoading?"Loading submissions…":"Generate Team Profile →"}
        </button>
        <button onClick={()=>setViewMode("home")} style={{width:"100%",background:"#1e293b",color:T.body,border:"1px solid #334155",borderRadius:10,padding:"12px",fontSize:13,cursor:"pointer"}}>
          ← Back
        </button>
      </div>
    </div>
  );

  // ── Landing screen ───────────────────────────────────────────────────────
  if(step===0) return(
    <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"system-ui,sans-serif"}}>
      <div style={{maxWidth:540,width:"100%",color:T.primary}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:32}}>
          <svg width="44" height="44" viewBox="0 0 100 100"><text x="4" y="70" fontFamily="Georgia,serif" fontStyle="italic" fontWeight="900" fontSize="72" fill="white">cc</text><line x1="6" y1="84" x2="70" y2="84" stroke="#a8e063" strokeWidth="6" strokeLinecap="round"/></svg>
          <div style={{lineHeight:1.2}}><div style={{fontSize:10,fontWeight:800,color:"#a8e063",letterSpacing:"3px",textTransform:"uppercase"}}>Constraints</div><div style={{fontSize:10,fontWeight:800,color:T.primary,letterSpacing:"3px",textTransform:"uppercase"}}>Collective</div></div>
        </div>
        <h1 style={{fontSize:28,fontWeight:900,marginBottom:8,color:T.primary}}>Coaching Beliefs Profiler</h1>
        <p style={{color:"#a8e063",fontSize:13,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:24}}>Personal Report Tool</p>
        <p style={{color:T.body,fontSize:14,lineHeight:1.8,marginBottom:24}}>This tool explores the beliefs that shape how you think about skill learning and how those beliefs show up in your coaching.</p>
        <p style={{color:T.secondary,fontSize:13,lineHeight:1.8,marginBottom:28}}>There are no right or wrong answers. We are interested in your genuine views.</p>
        <div style={{background:"#1e293b",borderRadius:14,padding:"16px 20px",marginBottom:24}}>
          <p style={{margin:0,color:T.body,fontSize:13,lineHeight:1.9}}><strong style={{color:T.primary}}>What to expect</strong><br/>A short introduction explaining why beliefs matter<br/>20 questions across two sections — about 10 minutes<br/>A personalised profile at the end</p>
        </div>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name (optional)" style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"11px 16px",color:T.primary,fontSize:14,marginBottom:14,boxSizing:"border-box",outline:"none"}}/>
        <button onClick={()=>setStep(0.5)} style={{width:"100%",background:"linear-gradient(135deg,#a8e063,#7ab83a)",color:"#0a0a0a",border:"none",borderRadius:10,padding:"13px",fontSize:15,fontWeight:800,cursor:"pointer",marginBottom:12}}>Begin</button>
        <button onClick={()=>setViewMode("team-admin")} style={{width:"100%",background:"transparent",color:T.faint,border:"none",fontSize:12,cursor:"pointer",padding:"6px"}}>
          Team profile admin →
        </button>
      </div>
    </div>
  );

  // ── Why this matters ─────────────────────────────────────────────────────
  if(step===0.5) return(
    <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"system-ui,sans-serif"}}>
      <div style={{maxWidth:580,width:"100%",color:T.primary}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:28}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#a8e063",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#0a0a0a"}}>i</div>
          <div style={{fontSize:11,fontWeight:700,color:"#a8e063",textTransform:"uppercase",letterSpacing:"2px"}}>Why This Matters</div>
        </div>
        <h2 style={{fontSize:22,fontWeight:900,marginBottom:20,color:T.primary}}>Why are we interested in your coaching beliefs?</h2>
        <div style={{fontSize:14,color:T.body,lineHeight:1.85,marginBottom:20}}>
          <p style={{marginBottom:14}}>Every coach brings a set of beliefs to their work — about what a skill is, how athletes learn, what practice should look like, and what good coaching feels like. Most of the time, these beliefs operate quietly in the background, shaping every decision you make without being explicitly examined.</p>
          <p style={{marginBottom:14}}>Much of what coaches do is grounded in accepted wisdom rather than in explicit, examined beliefs about how learning actually works. This is not a criticism — it is simply how coaching knowledge is passed on: through experience, watching other coaches, and trying things out.</p>
          <p>This tool is designed to help you surface and examine your beliefs — not to judge them, but to create a starting point for honest reflection and purposeful development.</p>
        </div>
        <div style={{background:"#1e293b",borderRadius:12,padding:"14px 18px",marginBottom:28,borderLeft:"3px solid #a8e063"}}>
          <p style={{fontSize:13,color:T.secondary,lineHeight:1.7,margin:0,fontStyle:"italic"}}>"The goal is to support you in unpacking your assumptions and beliefs — to deconstruct taken-for-granted habits and critically review your own practice. This goes beyond adding new knowledge. It is about genuine transformation."</p>
        </div>
        <div style={{background:"#1e293b",borderRadius:14,padding:"16px 20px",marginBottom:24}}>
          <p style={{margin:0,color:T.body,fontSize:13,lineHeight:1.9}}><strong style={{color:T.primary}}>How it works</strong><br/>Section 1 — 10 questions about how you think about skill learning<br/>Section 2 — 10 questions about how you coach in practice<br/>Each question shows 4 statements — drag each one to show how closely it reflects your view</p>
        </div>
        <button onClick={()=>setStep(1)} style={{width:"100%",background:"linear-gradient(135deg,#a8e063,#7ab83a)",color:"#0a0a0a",border:"none",borderRadius:10,padding:"13px",fontSize:15,fontWeight:800,cursor:"pointer"}}>Begin the Reflection →</button>
      </div>
    </div>
  );

  // ── Section break ────────────────────────────────────────────────────────
  if(isBreak) return(
    <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"system-ui,sans-serif"}}>
      <div style={{maxWidth:460,width:"100%",textAlign:"center",color:T.primary}}>
        <div style={{fontSize:48,marginBottom:14}}>✅</div>
        <h2 style={{fontSize:22,fontWeight:800,marginBottom:10,color:T.primary}}>Section 1 Complete</h2>
        <p style={{color:T.body,fontSize:14,lineHeight:1.75,marginBottom:8}}>You have finished How I Think About Skill Learning.</p>
        <p style={{color:T.secondary,fontSize:14,lineHeight:1.75,marginBottom:28}}>Section 2 explores How I Coach in Practice.</p>
        <button onClick={()=>setStep(11)} style={{width:"100%",background:"linear-gradient(135deg,#a8e063,#7ab83a)",color:"#0a0a0a",border:"none",borderRadius:10,padding:"13px",fontSize:15,fontWeight:800,cursor:"pointer"}}>Continue to Section 2 →</button>
      </div>
    </div>
  );

  // ── Results screen — simple invitation ──────────────────────────────────
  if(isResults){
    return(
      <div style={{minHeight:"100vh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"system-ui,sans-serif",color:T.primary}}>
        <div style={{maxWidth:480,width:"100%",textAlign:"center"}}>
          <div style={{fontSize:52,marginBottom:20}}>✦</div>
          <p style={{fontSize:11,color:"#a8e063",letterSpacing:"3px",textTransform:"uppercase",marginBottom:12,fontWeight:700}}>You're done</p>
          <h2 style={{fontSize:24,fontWeight:900,color:T.primary,marginBottom:16}}>
            {name ? name+"'s Coaching Beliefs Profile is ready" : "Your Coaching Beliefs Profile is ready"}
          </h2>
          <p style={{fontSize:14,color:T.body,lineHeight:1.8,marginBottom:32}}>
            Your profile explores the relationship between your beliefs about skill learning and how those beliefs show up in your coaching. Open it below to see what emerged.
          </p>
          <button onClick={openReport} style={{width:"100%",background:"linear-gradient(135deg,#a8e063,#7ab83a)",color:"#0a0a0a",border:"none",borderRadius:10,padding:"15px",fontSize:16,fontWeight:800,cursor:"pointer",marginBottom:12}}>
            Open My Profile →
          </button>
          {!teamSubmitted?(
            <div style={{marginTop:20,borderTop:"1px solid #1e293b",paddingTop:20}}>
              <p style={{fontSize:12,color:T.muted,marginBottom:10,textAlign:"left"}}>Adding your results to a team profile? Enter the team code below.</p>
              <input value={teamCode} onChange={e=>setTeamCode(e.target.value)} placeholder="Team code (e.g. HAWKS2025)" style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"10px 14px",color:T.primary,fontSize:13,boxSizing:"border-box",outline:"none",marginBottom:8,textTransform:"uppercase"}}/>
              {teamError&&<div style={{fontSize:12,color:"#ef4444",marginBottom:8}}>{teamError}</div>}
              <button onClick={submitToTeam} disabled={teamSubmitting} style={{width:"100%",background:"#1e293b",color:"#a8e063",border:"1px solid #a8e06366",borderRadius:8,padding:"10px",fontSize:13,fontWeight:700,cursor:"pointer",opacity:teamSubmitting?0.7:1}}>
                {teamSubmitting?"Saving…":"Add to Team Profile →"}
              </button>
            </div>
          ):(
            <div style={{marginTop:20,background:"#22c55e11",border:"1px solid #22c55e44",borderRadius:10,padding:"12px 16px",textAlign:"left"}}>
              <p style={{fontSize:13,color:"#4ade80",fontWeight:600}}>✓ Added to team {teamCode.toUpperCase()}</p>
              <p style={{fontSize:12,color:T.secondary,marginTop:4}}>Your results have been saved to the team profile.</p>
            </div>
          )}
          <button onClick={()=>{setStep(0);setAns({});setTeamCode("");setTeamSubmitted(false);}} style={{width:"100%",background:"#1e293b",color:T.body,border:"1px solid #334155",borderRadius:10,padding:"12px",fontSize:13,cursor:"pointer",marginTop:12}}>
            Start Again
          </button>
        </div>
      </div>
    );
  }

  // ── Question screens ─────────────────────────────────────────────────────
  return(
    <div style={{minHeight:"100vh",background:"#0f172a",padding:"24px 20px",fontFamily:"system-ui,sans-serif",color:T.primary}}>
      <div style={{maxWidth:620,margin:"0 auto"}}>
        <div style={{marginBottom:18}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.secondary,marginBottom:5}}>
            <span>{"Section "+currentQ.s+" / Q"+qNum+" of 10"}</span>
            <span style={{color:T.muted}}>{currentQ.topic}</span>
          </div>
          <div style={{background:"#1e293b",borderRadius:6,height:4}}><div style={{background:"linear-gradient(90deg,#a8e063,#7ab83a)",borderRadius:6,height:4,width:pct+"%",transition:"width 0.3s"}}/></div>
          <div style={{fontSize:10,color:T.muted,marginTop:4}}>{currentQ.s===1?"How I Think About Skill Learning":"How I Coach in Practice"}</div>
        </div>

        <div style={{background:"#1e293b",borderRadius:14,padding:"14px 18px",marginBottom:18}}>
          <p style={{fontSize:14,fontWeight:600,color:T.primary,margin:"0 0 4px",lineHeight:1.5}}>{currentQ.topic}</p>
          <p style={{fontSize:12,color:T.secondary,margin:0}}>{currentQ.stem}</p>
        </div>
        <SpectrumQuestion key={currentQ.id} question={currentQ} onComplete={handleComplete} isLast={currentQ.id===20}/>
      </div>
    </div>
  );
}
