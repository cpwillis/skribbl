const CACHE = 'skribbl-solver-v1';

const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/privacy.html',
    '/css/style.css',
    '/js/app.js',
    '/js/pwa.js',
    '/manifest.webmanifest',
    '/404.html',
  '/word_lists/manifest.json',
    '/word_lists/Categories/Animals/Animals.json',
    '/word_lists/Categories/Animals/Birds.json',
    '/word_lists/Categories/Animals/Bugs.json',
    '/word_lists/Categories/Animals/Dinosaurs.json',
    '/word_lists/Categories/Animals/Lizards.json',
    '/word_lists/Categories/Animals/Mammals.json',
    '/word_lists/Categories/Anime/Adventure.json',
    '/word_lists/Categories/Anime/Horror.json',
    '/word_lists/Categories/Anime/Romance.json',
    '/word_lists/Categories/Anime/SliceOfLife.json',
    '/word_lists/Categories/Brands/Automotive.json',
    '/word_lists/Categories/Brands/Fashion.json',
    '/word_lists/Categories/Brands/Tech.json',
    '/word_lists/Categories/Countries/Africa.json',
    '/word_lists/Categories/Countries/America.json',
    '/word_lists/Categories/Countries/Asia.json',
    '/word_lists/Categories/Countries/Europe.json',
    '/word_lists/Categories/Countries/Oceania.json',
    '/word_lists/Categories/Difficulties/Difficult.json',
    '/word_lists/Categories/Difficulties/Easy.json',
    '/word_lists/Categories/Difficulties/Hard.json',
    '/word_lists/Categories/Difficulties/Medium.json',
    '/word_lists/Categories/Dungeons&Dragons/GrabBag.json',
    '/word_lists/Categories/Dungeons&Dragons/Items.json',
    '/word_lists/Categories/Dungeons&Dragons/Monsters.json',
    '/word_lists/Categories/Dungeons&Dragons/Spells.json',
    '/word_lists/Categories/FamousPeople/Actors.json',
    '/word_lists/Categories/FamousPeople/Musicians.json',
    '/word_lists/Categories/FamousPeople/YouTubers.json',
    '/word_lists/Categories/Food&Drinks/Drinks.json',
    '/word_lists/Categories/Food&Drinks/Foods.json',
    '/word_lists/Categories/Food&Drinks/Vegetables.json',
    '/word_lists/Categories/HarryPotter/Characters.json',
    '/word_lists/Categories/HarryPotter/General.json',
    '/word_lists/Categories/HarryPotter/Spells.json',
    '/word_lists/Categories/Miscellaneous/Meme.json',
    '/word_lists/Categories/Miscellaneous/NSFW.json',
    '/word_lists/Categories/Miscellaneous/RandomItemsObjects.json',
    '/word_lists/Categories/Movies&Shows/Aciton.json',
    '/word_lists/Categories/Movies&Shows/Comedy.json',
    '/word_lists/Categories/Movies&Shows/Crime.json',
    '/word_lists/Categories/Movies&Shows/DCUniverse.json',
    '/word_lists/Categories/Movies&Shows/Horror.json',
    '/word_lists/Categories/Movies&Shows/Marvel.json',
    '/word_lists/Categories/Movies&Shows/Netflix.json',
    '/word_lists/Categories/Movies&Shows/TVSeries.json',
    '/word_lists/Categories/Pokemon/Gen1.json',
    '/word_lists/Categories/Pokemon/Gen2.json',
    '/word_lists/Categories/Pokemon/Gen3.json',
    '/word_lists/Categories/Pokemon/Gen4.json',
    '/word_lists/Categories/Pokemon/Gen5.json',
    '/word_lists/Categories/Pokemon/Gen6.json',
    '/word_lists/Categories/Pokemon/Gen7.json',
    '/word_lists/Categories/Pokemon/Gen8.json',
    '/word_lists/Categories/Sports/Athletes.json',
    '/word_lists/Categories/Sports/Sports.json',
    '/word_lists/Categories/VideoGames/Fortnite.json',
    '/word_lists/Categories/VideoGames/League of Legends.json',
    '/word_lists/Categories/VideoGames/LeagueOfLegends.json',
    '/word_lists/Categories/VideoGames/Minecraft.json',
    '/word_lists/Categories/VideoGames/MobileLegends.json',
    '/word_lists/Categories/VideoGames/Nintendo.json',
    '/word_lists/Categories/VideoGames/Overwatch Heroes.json',
    '/word_lists/Categories/VideoGames/Roblox.json',
    '/word_lists/Categories/VideoGames/SuperSmashBrosUltimate.json',
    '/word_lists/Default/English.json',
    '/word_lists/Default/English2.json',
    '/word_lists/Default/English3.json',
    '/word_lists/Default/French.json',
    '/word_lists/Default/German.json',
    '/word_lists/Default/Korean.json',
    '/word_lists/Default/Spanish.json',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    // Only handle same-origin GET requests
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (!response || response.status !== 200 || response.type !== 'basic') return response;
                const clone = response.clone();
                caches.open(CACHE).then(cache => cache.put(event.request, clone));
                return response;
            });
        })
    );
});
