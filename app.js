const express = require('express')
const crypto = require('node:crypto')
const cors = require('cors')
const movies = require('./movies.json')
const { validateMovie, validatePartialMovie } = require('./schemas/movies')

const app = express()
app.disable('x-powered-by')

//middleware que convierte el body en un json, en caso de serlo
app.use(express.json())

//middleware que controla los recursos cruzados (accesos/peticiones de otras webs)
app.use(cors({
    origin: (origin, callback) => {
      const ACCEPTED_ORIGINS = [
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'https://movies.com',
        'https://midu.dev'
      ]

      if(ACCEPTED_ORIGINS.includes(origin)) {
        return callback(null, true)
      }

      if (!origin) {
        return callback (null, true)
      }

      return callback (new Error('Not allowed by CORS'))
    }
 }))

// Metodos normales: GET/HEAD/POST
// Metodos complejos: PUT/PATCH/DELETE

// En metodos complejos existe una cosa llamada CORS PRE-Flight

// Todos los recursos que sean MOVIES se identivican con /movies
app.get('/movies', (req, res) => {
  const { genre } = req.query
  if (genre) {
    const filteredMovies = movies.filter(
      movie => movie.genre.some(g => g.toLowerCase() === genre.toLowerCase())
    )
    return res.json(filteredMovies)
  }
  res.json(movies)
})

app.get('/movies/:id', (req, res) => { //path-to-regexp
  const { id } = req.params
  const movie = movies.find(movie => movie.id === id)
  if (movie) return res.json(movie)
  res.status(404).json({ message: 'Movie not found' })
})

app.post('/movies', (req, res) => {
  const result = validateMovie(req.body)

  if (result.error) {  // !result.success <- Es una validación similar
    // Status '422 Unprocessable entity' : También sería interesante
    return res.status(400).json({ error: JSON.parse(result.error.message) })
  }

  const newMovie = {
    id: crypto.randomUUID(), //uuid versión 4
    ... result.data  // <- Esto no es lo mismo que req.body (result.data solamente tiene los datos filtrados de nosotros necesitamos y no nos pueden colar más información de la que nosotros requerimos) 
  }

  // Esto no es REST porque estamos guardando un estado
  // i rest es stateless!! (por ahora lo hacemos así)
  movies.push(newMovie)

  res.status(201).json(newMovie) // devuelve el recurso creado para actualizar la caché del cliente
})

app.delete('/movies/:id', (req, res) => { //path-to-regexp  
  const { id } = req.params
  const movieIndex = movies.findIndex(movie => movie.id === id)

  if (movieIndex === -1 ) {
    res.statusCode(404).json({ message: 'Movie not found'})
  }

  movies.splice(movieIndex, 1)

  return res.json({ message: 'Movie deleted' })
})

app.patch('/movies/:id', (req, res) => {
  const result = validatePartialMovie(req.body)
  
  if (!result.success) {
    // Status '422 Unprocessable entity' : También sería interesante
    return res.status(400).json({ error: JSON.parse(result.error.message) })
  }  

  const { id } = req.params
  const movieIndex = movies.findIndex(movie => movie.id === id)
  
  if (movieIndex === -1 ) {
    res.statusCode(404).json({ message: 'Movie not found'})
  }

  const updateMovie = {
    ... movies[movieIndex],
    ... result.data
  }    

  movies[movieIndex] = updateMovie

  return res.status(200).json(movies[movieIndex])
})

const PORT = process.env.PORT ?? 1234

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`)
})


