
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

        fetch(`https://api.vapi.ai/call/${callID}`, {
            method: 'get',
            headers: new Headers({
                'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
                'Content-Type': 'application/json'
            }),
        })
        .then(res => res.json())
        .then(resObj => {
            const assistantId = resObj?.assistantId;
            const startTime = resObj.startedAt;
            const endTime = resObj.endedAt;
            const duration = getDuration(startTime, endTime);
            const cost =  resObj.cost.toFixed(2);
            const phoneNumber = req.body.customer?.number || '';

            const data = {
              action_name: 'VAPI CALL Ended',
              company_id: "cus_QX8yUwzGuAu12a",
              request: {
                time: new Date().toISOString()

              },
              metadata: {
                assistant_id: assistantId,
                customer_id: '123453829',
                call_id: callID,
                phone_number: phoneNumber,
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
                return res.json({
                  status: true,
              });
                console.log('Moesif API Request successful');
              } else {
                return res.json({
                  status: false,
              });
                console.error('Moesif API Request failed:', response.status);
              }
            })
            .catch(error => {
              console.error('Error:', error);
            });
        })
        .catch(error => console.error('VAPI API Calling Error: ', error));
    }
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
    if(minutes === 0  && seconds > 0)
    {
      minutes = 1;
      seconds = 0;
    }
    return {minutes, seconds}
}


app.listen(3000, () => console.log('VAPI Webhook is listening'));
