const express = require('express')
const morgan = require('morgan')
const Person = require('./models/person')

const app = express()
app.use(express.static('dist'))
app.use(express.json())

morgan.token('body', function (req) {
  if (!req.body) {
    return ''
  }
  return JSON.stringify({
    name: req.body.name,
    number: req.body.number
  })
})

app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body'))

const getInfo = () => {
  return Person.countDocuments()
    .then(count => `<p>Phonebook has info for ${count} people</p>
    <p>${new Date()}</p>`
    )
}

app.get('/api/persons', (request, response) => {
  Person.find({}).then(result => {
    response.json(result)
  })
})

app.get('/api/info', (request, response) => {
  getInfo().then(info => 
    response.send(info)
  )
})

app.get('/api/persons/:id', (request, response, next) => {
  Person.findById(request.params.id)
    .then(person => {
      if (person) {
        response.json(person)
      } else {
        response.status(404).end()
      }
    })
    .catch(error => next(error))
})

app.delete('/api/persons/:id', (request, response, next) => {
  Person.findByIdAndDelete(request.params.id)
    .then(result => {
      if (result) {
        response.status(204).end()
      }
      else {
        response.status(404).end()
      }

    })
    .catch(error => next(error))
})

app.post('/api/persons', (request, response, next) => {
  const body = request.body
    
  if (!body.name) {
    return response.status(400).json({
      error: 'name missing'
    })
  }
  else if (!body.number) {
    return response.status(400).json({
      error: 'number missing'
    })
  }
  Person.findOne({ name : { $regex: `^${request.body.name}$`, $options: 'i' } }).then(result => { 
    if(result) {
      return response.status(400).json({
        error: 'name must be unique'
      }
      )}
    else {
      const person = new Person({
        name: body.name,
        number: body.number
      })
        
      person.save().then(savedPerson => {
        response.json(savedPerson)
      })
        .catch(error => next(error))
    }
  })
})

app.put('/api/persons/:id', (request, response, next) => {
  const { name, number } = request.body

  Person.findById(request.params.id)
    .then(person => {
      if(!person) {
        return response.status(404).end()
      }

      person.name = name
      person.number = number

      return person.save().then((updatedPerson) => {
        response.json(updatedPerson)
      })
    })
    .catch(error => next(error))
})

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

app.use(unknownEndpoint)

const errorHandler = (error, request, response, next) => {
  console.error(error.message)

  if (error.name === 'Cast Error') {
    return response.status(400).send({ error: 'malformatted id' })
  }   else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  }
  next(error)
}

app.use(errorHandler)

const PORT = process.env.PORT

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})