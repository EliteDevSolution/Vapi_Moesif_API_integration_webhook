
'use strict';

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express().use(bodyParser.json()); // creates http server

const token = process.env.VAPI_TOKEN;
const applicationId = process.env.MOESIF_APP_ID;
const moesifApiUrl = 'https://api.moesif.net/v1/actions';

app.get('/', (req, res) => {
    return res.sendStatus(200);
});

app.post('/webhook', (req, res) => {
    //console.log("first", req.body);
    // check if verification token is correct
    const vapiSecretToken = req.headers['x-vapi-secret'];

    if (vapiSecretToken !== token) {
        return res.sendStatus(401);
    }

    const callStatus = req.body.message.type || '';
    if(callStatus === "end-of-call-report")
    {
        var callID = req.body.message.call.id || '';
        //callID = "fa61c90a-4455-4671-8902-3393c89419b3";
        const phoneNumber = req.body.message?.phoneNumber?.number || '';

        fetch(`https://api.vapi.ai/call/${callID}`, {
            method: 'get',
            headers: new Headers({
                'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
                'Content-Type': 'application/json'
            }),
        })
        .then(res => res.json())
        .then(resObj => {
            //const assistantId = resObj.assistantId;
            const startTime = resObj.startedAt;
            const endTime = resObj.endedAt;
            const duration = getDuration(startTime, endTime);
            const cost =  resObj.cost.toFixed(2);

            console.log('phoneNumber:', phoneNumber);
            console.log('CallID:', callID);
            console.log('Cost:', cost);
            console.log('Duration:', duration);

            const data = {
              action_name: 'VAPI CALL Ended',
              request: {
                time: new Date().toISOString()

              },
              customer_id: '12345',
              call_id: callID,
              phone_number: phoneNumber,
              metadata: {
                cost: cost,
                duration_minutes: duration.minutes,
                duration_seconds: duration.seconds,
              }
            };

            const headers = {
              'Content-Type': 'application/json',
              'X-Moesif-Application-Id': applicationId
            };

            fetch(moesifApiUrl, {
              method: 'POST',
              headers: headers,
              body: JSON.stringify(data)
            })
            .then(response => {
              if (response.ok) {
                console.log('Request successful');
              } else {
                console.error('Request failed:', response.status);
              }
            })
            .catch(error => {
              console.error('Error:', error);
            });
        })
        .catch(error => console.error('VAPI API Calling Error: ', error));
    }
    return res.json({
        status: true,
    });
});

function getDuration(startTime = '', endTime = '')
{
    // Convert the strings to Date objects
    const start = new Date(startTime);
    const end = new Date(endTime);

    // Calculate the duration in milliseconds
    const durationMs = end.getTime() - start.getTime();

    // Convert the duration to seconds
    const durationSeconds = durationMs / 1000;
    // Calculate minutes and seconds
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.round(durationSeconds % 60);

    return {minutes, seconds}
}


app.listen(3000, () => console.log('VAPI Webhook is listening'));
