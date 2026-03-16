# MAS552-POIs-Class-Game-1.0
Urban Accessibility Analysis Tool
MAS.552 · MIT Media Lab – City Science

Overview

The POI Walking-Time Game is an interactive teaching tool designed to explore urban accessibility and spatial perception. The application challenges users to estimate walking times from a selected location to nearby amenities, and then compares those estimates with real walking routes calculated from OpenStreetMap data.

The goal of the tool is to help students reflect on how accurately people perceive distances and accessibility in urban environments.

The application combines:

OpenStreetMap spatial data

Real walking route calculations

Reference accessibility benchmarks derived from research

Neighborhood demographic context (U.S. Census)

The interface allows users to compare three scenarios:

Guess – the user’s estimated walking time

Real – calculated walking time from routing data

Thesis Reference – baseline distances derived from the research document Memoria Final

Results are visualized through maps, tables, and radar plots to provide an intuitive understanding of accessibility patterns.

How the Game Works

Choose a location anywhere in the world

The user can search for an address or click on the map.

Blind estimation phase

Before seeing any nearby amenities, the user estimates walking times to common services such as:

Grocery store

School

Pharmacy

Café

Restaurant

Park

Hospital / Clinic

Transit stops

Reveal real accessibility

After submitting the guesses, the system retrieves:

Nearby POIs from OpenStreetMap

Real walking routes via OSRM

Reference distances from the thesis baseline dataset

Compare outcomes

The tool then visualizes:

Guess vs Real vs Reference walking times

Estimation error

Accessibility profile radar plot

Neighborhood demographic context (U.S. Census)

Key Features

Global location search

Real walking routes calculated from OpenStreetMap data

Blind estimation game design (no hints before guessing)

Comparison between Guess / Real / Thesis reference

Radar chart showing accessibility profile across amenities

Structured analytical dashboard

Optional Census demographic context (U.S. locations)

Data Sources

The application integrates several open data sources:

OpenStreetMap (OSM)
POI locations and spatial data.

Overpass API
Querying nearby amenities.

OSRM (Open Source Routing Machine)
Walking route calculations.

U.S. Census API
Neighborhood demographic indicators including:

Median income

Median age

Population

Poverty rate

Thesis Baseline Dataset
Distances derived from the research document:

Memoria Final – Accessibility Reference Distances

Radar Visualization

The radar chart visualizes accessibility profiles across amenities.

Values are normalized using the rule:

0 minutes  = 100
30 minutes = 0

Meaning:

shorter walking times expand outward

longer walking times shrink inward

The radar compares:

Guess

Real

Thesis Reference

This provides an intuitive visual comparison of accessibility conditions.

Project Structure
src/
  components/
    GameMap
    AmenityPanel
    ResultsPanel
    ComparisonChart
    NeighborhoodContextPanel

  services/
    geocoding.ts
    poi.ts
    routing.ts
    baseline.ts
    census.ts

  hooks/
    useGameState.ts

  data/
    baselineData.ts

  types/
    index.ts
Running the Project

Install dependencies:

npm install

Start the development server:

npm run dev

Build the production version:

npm run build
Deployment

The application is a static frontend application and can be deployed on:

GitHub Pages

MIT web servers

Media Lab infrastructure

any static hosting service

Educational Context

This tool was developed as part of:

MAS.552 – Urban Accessibility
MIT Media Lab · City Science Group

The objective is to encourage students to critically reflect on:

perception of distance

accessibility inequalities

spatial cognition

urban service distribution

License

MIT License
