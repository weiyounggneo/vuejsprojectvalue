<template>
  <div class="modal-overlay">
    <div class="modal large-modal">
      <h3>{{ showAddForm ? 'Add New Project' : 'Update Project Data' }}</h3>

      <form @submit.prevent="saveDraft">
        <!-- SECTION 1: METADATA -->
        <h4 class="section-heading">1. Project Details (Metadata)</h4>
        <div class="form-grid">
          <div class="form-group">
            <label for="projectId">Project ID <span style="color:red">*</span></label>
            <input id="projectId" type="text" v-model="activeForm.projectId" :disabled="showUpdateForm || isProcessing || !!addProjectCreatedId" required />
          </div>

          <div class="form-group">
            <label for="projectName">Project Name <span style="color:red">*</span></label>
            <input id="projectName" type="text" v-model="activeForm.projectName" :disabled="isProcessing" required />
          </div>

          <div class="form-group" v-if="isFieldShown('projectStatus')">
            <label for="projectStatus">Project Status</label>
            <select id="projectStatus" v-model="activeForm.projectStatus" :disabled="isProcessing">
              <option value="">(Blank)</option>
              <option v-for="status in configOptions.STATUS" :key="status" :value="status">{{ status }}</option>
            </select>
          </div>

          <div class="form-group" v-if="isFieldShown('pillars')">
            <label for="pillars">Pillars</label>
            <select id="pillars" v-model="activeForm.pillars" :disabled="isProcessing">
              <option value="">(Blank)</option>
              <option v-for="pillar in configOptions.PILLAR" :key="pillar" :value="pillar">{{ pillar }}</option>
            </select>
          </div>

          <div class="form-group" v-if="isFieldShown('sites')">
            <label>Sites (Select Multiple)</label>
            <div class="checkbox-group">
              <label><input type="checkbox" value="ALL" v-model="activeForm.sitesArray" :disabled="isProcessing"> ALL</label>
              <label v-for="site in siteChoices" :key="site.key">
                <input type="checkbox" :value="site.value" v-model="activeForm.sitesArray" :disabled="isProcessing"> {{ site.label }}<span v-if="site.missing"> (Missing from Master Data)</span>
              </label>
            </div>
            <p v-if="missingSiteChoices.length" class="project-fields-notice" role="status">This project uses {{ missingSiteChoices.map(site => site.label).join(', ') }} but {{ missingSiteChoices.length === 1 ? 'it is' : 'they are' }} missing from Master Data. The value is kept when you save; ask an admin to configure it for new projects.</p>
          </div>

          <div class="form-group" v-if="isFieldShown('currentPmoGate')">
            <label for="currentPmoGate">Current PMO Gate</label>
            <select id="currentPmoGate" v-model="activeForm.currentPmoGate" :disabled="isProcessing">
              <option value="">(Blank)</option>
              <option v-for="gate in configOptions.PMOGATE" :key="gate" :value="gate">{{ gate }}</option>
            </select>
          </div>

          <div class="form-group" v-if="isFieldShown('dtitInvolved')">
            <label for="dtitInvolved">DTIT Involved</label>
            <select id="dtitInvolved" v-model="activeForm.dtitInvolved" :disabled="isProcessing">
              <option value="">(Blank)</option>
              <option v-for="opt in configOptions.DTIT" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>

          <div class="form-group" v-if="isFieldShown('aiAaAType')">
            <label for="aiAaAType">AI/AA/A type</label>
            <select id="aiAaAType" v-model="activeForm.aiAaAType" :disabled="isProcessing">
              <option value="">(Blank)</option>
              <option v-for="opt in configOptions.AITYPE" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>

          <div class="form-group" v-if="isFieldShown('foakNoak')">
            <label for="foakNoak">FOAK/NOAK</label>
            <select id="foakNoak" v-model="activeForm.foakNoak" :disabled="isProcessing">
              <option value="">(Blank)</option>
              <option v-for="opt in configOptions.FOAKNOAK" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
          <custom-project-fields :fields="fieldsBySection.details" :values="activeForm.customFields" :is-processing="isProcessing" @change-value="setCustomValue" />
        </div>

        <p v-if="projectFieldsError" class="project-fields-notice">Added fields are unavailable. Existing project details can still be saved.</p>

        <!-- SECTION 2: YEARLY DATA -->
        <h4 v-if="hasVisibleValueFields" class="section-heading">2. Yearly Data (Values)</h4>
        <div v-if="hasVisibleValueFields" class="form-grid">
          <div class="form-group" v-for="year in visibleTrackingYears" :key="year">
            <label :for="'year' + year">{{ year }}</label>
            <input
              :id="'year' + year"
              type="number"
              step="any"
              v-model="activeForm['year' + year]"
              :disabled="isProcessing"
            />
          </div>

          <custom-project-fields :fields="fieldsBySection.values" :values="activeForm.customFields" :is-processing="isProcessing" @change-value="setCustomValue" />

          <div class="form-group full-width" v-if="isFieldShown('comment')">
            <label for="comment">Comment</label>
            <input id="comment" type="text" v-model="activeForm.comment" :disabled="isProcessing" />
          </div>
        </div>

        <!-- SECTION 3: KPIs -->
        <h4 v-if="hasVisibleKpiSection" class="section-heading">3. Key Performance Indicators</h4>
        <div v-if="hasVisibleKpiSection" class="form-grid">
          <div class="form-group" v-if="isFieldShown('capacityGainValue')">
            <label for="capacityGainValue">Capacity Gain Value</label>
            <input id="capacityGainValue" type="number" step="any" v-model="activeForm.capacityGainValue" :disabled="isProcessing" />
          </div>

          <div class="form-group" v-if="isFieldShown('capacityGainPercent')">
            <label for="capacityGainPercent">Capacity Gain %</label>
            <input id="capacityGainPercent" type="number" step="any" v-model="activeForm.capacityGainPercent" :disabled="isProcessing" />
          </div>

          <div class="form-group" v-if="isFieldShown('dlValue')">
            <label for="dlValue">DL Value</label>
            <input id="dlValue" type="number" step="any" v-model="activeForm.dlValue" :disabled="isProcessing" />
          </div>

          <div class="form-group" v-if="isFieldShown('dlEquivalent')">
            <label for="dlEquivalent">DL Equivalent</label>
            <input id="dlEquivalent" type="number" step="any" v-model="activeForm.dlEquivalent" :disabled="isProcessing" />
          </div>

          <div class="form-group" v-if="isFieldShown('idlValue')">
            <label for="idlValue">IDL Value</label>
            <input id="idlValue" type="number" step="any" v-model="activeForm.idlValue" :disabled="isProcessing" />
          </div>

          <div class="form-group" v-if="isFieldShown('idlFte')">
            <label for="idlFte">IDL FTE</label>
            <input id="idlFte" type="number" step="any" v-model="activeForm.idlFte" :disabled="isProcessing" />
          </div>

          <div class="form-group" v-if="isFieldShown('yieldValue')">
            <label for="yieldValue">Yield Value</label>
            <input id="yieldValue" type="number" step="any" v-model="activeForm.yieldValue" :disabled="isProcessing" />
          </div>

          <div class="form-group" v-if="isFieldShown('yieldPercentGain')">
            <label for="yieldPercentGain">Yield (%) Gain</label>
            <input id="yieldPercentGain" type="number" step="any" v-model="activeForm.yieldPercentGain" :disabled="isProcessing" />
          </div>

          <div class="form-group" v-if="isFieldShown('qualityValue')">
            <label for="qualityValue">Quality Value</label>
            <input id="qualityValue" type="number" step="any" v-model="activeForm.qualityValue" :disabled="isProcessing" />
          </div>

          <div class="form-group" v-if="isFieldShown('qualityCases')">
            <label for="qualityCases">Quality Cases</label>
            <input id="qualityCases" type="number" step="any" v-model="activeForm.qualityCases" :disabled="isProcessing" />
          </div>
          <custom-project-fields :fields="fieldsBySection.kpis" :values="activeForm.customFields" :is-processing="isProcessing" @change-value="setCustomValue" />
        </div>

        <!-- SECTION 4: TIMELINE TARGETS & ACTUALS -->
        <h4 v-if="hasVisibleMilestoneSection" class="section-heading">4. Timeline Milestones (Targets & Actuals)</h4>
        <p v-if="hasVisibleMilestoneFields" class="project-field-help">Choose or clear actual milestone dates below. Dates you leave unchanged keep their current automatic behavior.</p>
        <div v-if="hasVisibleMilestoneSection" class="form-grid">
          <div class="form-group" v-if="isFieldShown('targetG1Date')">
            <label for="targetG1Date">Target G1 Date</label>
            <input id="targetG1Date" type="date" v-model="activeForm.targetG1Date" :disabled="isProcessing" />
          </div>
          <div class="form-group" v-if="isFieldShown('actualG1Date')">
            <label for="actualG1Date" style="color: #1f5fa8;">Actual G1 Date</label>
            <input id="actualG1Date" type="date" v-model="activeForm.actualG1Date" min="1000-01-01" max="9999-12-31" :disabled="isProcessing || !isEditor" />
          </div>

          <div class="form-group" v-if="isFieldShown('targetG2Date')">
            <label for="targetG2Date">Target G2 Date</label>
            <input id="targetG2Date" type="date" v-model="activeForm.targetG2Date" :disabled="isProcessing" />
          </div>
          <div class="form-group" v-if="isFieldShown('actualG2Date')">
            <label for="actualG2Date" style="color: #1f5fa8;">Actual G2 Date</label>
            <input id="actualG2Date" type="date" v-model="activeForm.actualG2Date" min="1000-01-01" max="9999-12-31" :disabled="isProcessing || !isEditor" />
          </div>

          <div class="form-group" v-if="isFieldShown('targetG3Date')">
            <label for="targetG3Date">Target G3 Date</label>
            <input id="targetG3Date" type="date" v-model="activeForm.targetG3Date" :disabled="isProcessing" />
          </div>
          <div class="form-group" v-if="isFieldShown('actualG3Date')">
            <label for="actualG3Date" style="color: #1f5fa8;">Actual G3 Date</label>
            <input id="actualG3Date" type="date" v-model="activeForm.actualG3Date" min="1000-01-01" max="9999-12-31" :disabled="isProcessing || !isEditor" />
          </div>

          <div class="form-group" v-if="isFieldShown('targetClosedDate')">
            <label for="targetClosedDate">Target Closed Date</label>
            <input id="targetClosedDate" type="date" v-model="activeForm.targetClosedDate" :disabled="isProcessing" />
          </div>
          <div class="form-group" v-if="isFieldShown('actualClosedDate')">
            <label for="actualClosedDate" style="color: #1f5fa8;">Actual Closed Date</label>
            <input id="actualClosedDate" type="date" v-model="activeForm.actualClosedDate" min="1000-01-01" max="9999-12-31" :disabled="isProcessing || !isEditor" />
          </div>
          <custom-project-fields :fields="fieldsBySection.milestones" :values="activeForm.customFields" :is-processing="isProcessing" @change-value="setCustomValue" />
        </div>

        <p v-if="showAddForm && addProjectCreatedId" class="project-fields-notice">
          Project {{ addProjectCreatedId }} has already been created. Saving again finishes the remaining project values.
        </p>
        <p v-if="columnVisibilityError" class="project-data-error" role="alert">{{ columnVisibilityError }}</p>
        <p v-if="formError" class="project-data-error" role="alert">{{ formError }}</p>
        <div class="modal-actions">
          <button type="submit" class="actions primary-btn" :disabled="isProcessing || !columnVisibilityLoaded || !!columnVisibilityError">
            {{ isProcessing ? 'Saving...' : 'Save Record' }}
          </button>
          <button type="button" class="actions cancel" @click="$emit('close', $event)" :disabled="isProcessing">
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { cloneForm } from '../logic/formDraft';
import { fieldSection } from '../../project-fields/sections';
import { normalizeSite, splitSites } from '../../portfolio-layout/siteOptions';
import CustomProjectFields from './CustomProjectFields.vue';

export default {
  name: 'ProjectFormDialog',
  components: { CustomProjectFields },
  props: [
    'addProjectCreatedId',
    'columnVisibilityError',
    'columnVisibilityLoaded',
    'configOptions',
    'customFieldHelp',
    'form',
    'formError',
    'hasVisibleKpiFields',
    'hasVisibleMilestoneFields',
    'hasVisibleYearlyFields',
    'isEditor',
    'isFieldShown',
    'isProcessing',
    'projectFieldsError',
    'showAddForm',
    'showUpdateForm',
    'visibleProjectFields',
    'visibleTrackingYears'
  ],
  emits: [
    'close',
    'save'
  ],
  data() { return { activeForm: cloneForm(this.form) }; },
  computed: {
    fieldsBySection() {
      const groups = { details: [], values: [], kpis: [], milestones: [] };
      if (!this.projectFieldsError) for (const field of this.visibleProjectFields || []) {
        groups[fieldSection(field)]?.push(field);
      }
      return groups;
    },
    hasVisibleValueFields() {
      return this.hasVisibleYearlyFields || this.fieldsBySection.values.length > 0;
    },
    hasVisibleKpiSection() {
      return this.hasVisibleKpiFields || this.fieldsBySection.kpis.length > 0;
    },
    hasVisibleMilestoneSection() {
      return this.hasVisibleMilestoneFields || this.fieldsBySection.milestones.length > 0;
    },
    siteChoices() {
      const selected = new Map((this.activeForm.sitesArray || []).map(value => [normalizeSite(value), String(value).trim()]).filter(([key]) => key));
      const configured = new Set((this.configOptions?.SITE || []).flatMap(splitSites));
      return [...new Set([...configured, ...selected.keys()])].sort((a, b) => a.localeCompare(b)).map(key => ({
        key,
        value: selected.get(key) || key,
        label: key,
        missing: !configured.has(key)
      }));
    },
    missingSiteChoices() { return this.siteChoices.filter(site => site.missing); },
  },
  watch: { form: { deep: true, handler(value) { this.activeForm = cloneForm(value); } } },
  methods: {
    setCustomValue(columnName, value) { this.activeForm.customFields[columnName] = value; },
    saveDraft() { this.$emit('save', cloneForm(this.activeForm)); },
  },
};
</script>

<style scoped src="../styles/grid.css"></style>
<style scoped src="../styles/dialogs.css"></style>
<style scoped src="../styles/responsive.css"></style>
