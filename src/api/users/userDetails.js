import axios from 'axios';

const baseUrl = `${import.meta.env.VITE_API_BASE_URL}/api/users`;


export async function postUserDetails(requestBody) {
    const accessToken = localStorage.getItem('accessToken');

    const response = await axios.post(`${baseUrl}/details`, requestBody, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    });
    return response.data;
}
