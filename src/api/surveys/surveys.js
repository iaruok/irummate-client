import axios from 'axios';

const baseUrl = `${import.meta.env.VITE_API_BASE_URL}/api/surveys`;

export async function postSurveys(requestBody) {
    const accessToken = localStorage.getItem('accessToken');

    const response = await axios.post(baseUrl, requestBody, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    });
    return response.data;
}
