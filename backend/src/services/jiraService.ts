import axios from 'axios';
import { JiraIssue } from '../types';

export class JiraService {
  private baseUrl: string;
  private auth: string;

  constructor() {
    this.baseUrl = process.env.JIRA_BASE_URL || '';
    const email = process.env.JIRA_EMAIL || '';
    const apiToken = process.env.JIRA_API_TOKEN || '';
    this.auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  }

  private getHeaders() {
    return {
      'Authorization': `Basic ${this.auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  async getResolvedBugs(accountId: string, startDate: Date): Promise<JiraIssue[]> {
    try {
      const jql = `assignee = "${accountId}" AND issuetype = Bug AND status = Done AND resolved >= ${startDate.toISOString().split('T')[0]}`;
      
      const response = await axios.get(`${this.baseUrl}/rest/api/3/search`, {
        headers: this.getHeaders(),
        params: {
          jql,
          fields: 'key,summary,status,assignee,issuetype,resolution,updated',
          maxResults: 100
        }
      });

      return response.data.issues || [];
    } catch (error) {
      console.error('Error fetching Jira bugs:', error);
      return [];
    }
  }

  async getUserActivity(accountId: string, startDate: Date): Promise<JiraIssue[]> {
    try {
      const jql = `assignee = "${accountId}" AND updated >= ${startDate.toISOString().split('T')[0]}`;
      
      const response = await axios.get(`${this.baseUrl}/rest/api/3/search`, {
        headers: this.getHeaders(),
        params: {
          jql,
          fields: 'key,summary,status,assignee,issuetype,resolution,updated',
          maxResults: 100
        }
      });

      return response.data.issues || [];
    } catch (error) {
      console.error('Error fetching Jira activity:', error);
      return [];
    }
  }

  async getUser(accountId: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/rest/api/3/user`, {
        headers: this.getHeaders(),
        params: { accountId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Jira user:', error);
      return null;
    }
  }
}