# A* 8-Puzzle Solver

Interactive, browser-native solver for the classic 8-puzzle.  
Runs entirely on the client using OpenCV.js + A* search with Manhattan-distance heuristic.  
Drag in an image → tiles auto-extracted → puzzle jumbled with guaranteed solvability → step-by-step A* solution.

Live demo:  
**https://a-star-puzzle.netlify.app/**

---

## Features

- Image-based tile extraction (OpenCV.js)
- Automatic blank-tile generation
- Solvability check using inversion parity
- Manhattan-distance heuristic (A*)
- Efficient neighbor expansion + path reconstruction
- Smooth step playback of the solved path
- Full client-side execution (no backend)

---

## Demo

Upload an Image.
Jumble to randomise.
Solve.
Iterate Steps.

<img src="rsc/demo1.gif" width="300">

Done? Upload New Image.

<img src="rsc/demo2.gif" width="300">

---

## How It Works

### 1. Tile Extraction
The input image is resized to 399×399 and sliced into a 3×3 grid using OpenCV ROI operations.

### 2. Solvability Check
The tile permutation is validated via inversion count:

```
solvable ↔ inversion_count(state) % 2 === 0
```

The jumble logic repeats random shuffles until this condition holds.

### 3. A* Search
Search node stores:
- `state` (flat 9-element array)
- `g` cost (depth)
- `h` (Manhattan)
- `f = g + h`
- `parent` pointer

Priority queue picks smallest `f`.

### 4. Path Reconstruction
Parents are followed backward to build the solution sequence.

---

## Tech Stack

- HTML / CSS / Vanilla JS
- ES Modules
- OpenCV.js (WASM)
- Netlify (static hosting)

---

## Roadmap

- Add alternative puzzles (15-puzzle)
- Add User Control to Move Tiles.
- Gamify It. Scores, Sounds etc.

---

## License

MIT License

