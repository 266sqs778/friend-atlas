import { $ } from "../lib/dom.js";
import { PROVINCES, PROVINCE_CITIES } from "../data/provinces.js";
import { normalizeFriend, validateFriend } from "../lib/model.js";

const FIELD_ORDER = ["name", "gender", "relationship", "province", "city", "birthday"];

export function createFriendSheet({ sheets, onSave }) {
  const form = $("#friend-form");
  const idInput = $("#friend-id");
  const nameInput = $("#f-name");
  const birthdayInput = $("#f-birthday");
  const genderGroup = $("#f-gender");
  const genderValue = $("#f-gender-value");
  const relationshipSelect = $("#f-relationship");
  const notesInput = $("#f-notes");
  const provinceSelect = $("#f-province");
  const citySelect = $("#f-city");
  const title = $("#sheet-friend-title");
  const subtitle = $("#sheet-friend-sub");
  const errorBox = $("#form-error");
  const saveButton = $("#btn-save");

  provinceSelect.innerHTML =
    '<option value="">请选择省份</option>' +
    PROVINCES.map((province) => `<option value="${province}">${province}</option>`).join("");

  function fillCities(province, selectedCity = "") {
    const cities = PROVINCE_CITIES[province] || [];
    citySelect.disabled = cities.length === 0;
    citySelect.innerHTML = cities.length
      ? '<option value="">请选择城市</option>' + cities.map((city) => `<option value="${city}">${city}</option>`).join("")
      : '<option value="">请先选择省份</option>';
    if (selectedCity && cities.includes(selectedCity)) citySelect.value = selectedCity;
  }

  function setGender(value) {
    const next = ["男", "女", "其他"].includes(value) ? value : "男";
    genderValue.value = next;
    genderGroup.querySelectorAll("[data-gender]").forEach((button) => {
      button.setAttribute("aria-checked", String(button.dataset.gender === next));
    });
  }

  function clearErrors() {
    errorBox.hidden = true;
    errorBox.textContent = "";
    form.querySelectorAll(".is-invalid").forEach((field) => field.classList.remove("is-invalid"));
  }

  function markInvalid(fieldName) {
    const field = form.querySelector(`[name="${fieldName}"]`);
    if (!field) return;
    const wrapper = field.closest(".field");
    if (wrapper) wrapper.classList.add("is-invalid");
  }

  function open(friend = null) {
    form.reset();
    clearErrors();
    if (friend) {
      idInput.value = friend.id;
      nameInput.value = friend.name;
      birthdayInput.value = friend.birthday;
      relationshipSelect.value = friend.relationship;
      notesInput.value = friend.notes;
      provinceSelect.value = friend.province;
      fillCities(friend.province, friend.city);
      setGender(friend.gender);
      title.textContent = "编辑朋友";
      subtitle.textContent = `正在编辑 ${friend.name} 的信息`;
      saveButton.textContent = "保存修改";
    } else {
      idInput.value = "";
      fillCities("");
      setGender("男");
      title.textContent = "添加朋友";
      subtitle.textContent = "带 * 的字段为必填";
      saveButton.textContent = "保存";
    }
    sheets.open("friend");
    setTimeout(() => nameInput.focus(), 60);
  }

  provinceSelect.addEventListener("change", () => fillCities(provinceSelect.value));

  genderGroup.addEventListener("click", (event) => {
    const button = event.target.closest("[data-gender]");
    if (!button) return;
    setGender(button.dataset.gender);
    const wrapper = button.closest(".field");
    if (wrapper) wrapper.classList.remove("is-invalid");
  });

  form.addEventListener("input", (event) => {
    const wrapper = event.target.closest(".field");
    if (wrapper) wrapper.classList.remove("is-invalid");
    if (!errorBox.hidden) {
      errorBox.hidden = true;
      errorBox.textContent = "";
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const draft = normalizeFriend({
      id: idInput.value || undefined,
      name: data.get("name"),
      gender: data.get("gender"),
      birthday: data.get("birthday"),
      province: data.get("province"),
      city: data.get("city"),
      relationship: data.get("relationship"),
      notes: data.get("notes")
    });

    const errors = validateFriend(draft);
    if (errors.length) {
      errorBox.textContent = errors[0];
      errorBox.hidden = false;
      const fieldKey = FIELD_ORDER.find((field) => {
        if (field === "name") return !draft.name;
        if (field === "gender") return !draft.gender;
        if (field === "province") return !draft.province;
        if (field === "city") return !draft.city;
        if (field === "relationship") return !draft.relationship;
        if (field === "birthday") return Boolean(draft.birthday) && errors.some((item) => item.includes("生日"));
        return false;
      });
      if (fieldKey) markInvalid(fieldKey);
      return;
    }

    onSave(draft, Boolean(idInput.value));
    sheets.close("friend");
  });

  return { open };
}
